"use server";

import { z } from "zod";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { decode } from "base64-arraybuffer";
import { SuiClient } from "@mysten/sui/client";
import { getFullnodeUrl } from "@mysten/sui/client";
import { createClient } from "@supabase/supabase-js";
import { IMAIGINE_ADDRESS, IMAIGINE_PACKAGE_ADDRESS, SUI_NETWORK } from "./consts";
import { queue, subscribe } from "@fal-ai/serverless-client";
import { KioskClient, KioskOwnerCap, Network } from "@mysten/kiosk";
import { FalModelResult, FalResult, Model, ModelType, nanoid } from "./utils";
import { MIST_PER_SUI } from "@mysten/sui/utils";

const client = new SuiClient({ url: getFullnodeUrl(SUI_NETWORK) });

export const imagine = async (triggerWord: string, modelType: ModelType) => {
  let promptInstruction = "";

  if (modelType === "people") {
    promptInstruction = `Generate a creative prompt for a text-to-image AI model featuring a person named ${triggerWord}. The prompt MUST ensure that the person's face is clearly visible. Do not mention the gender of the person.`;
  } else if (modelType === "style") {
    promptInstruction = `image of X in style of ${triggerWord}, Generate an artistic prompt for a text-to-image AI model showcasing a unique visual style. Focus on describing the aesthetic elements`;
  } else {
    promptInstruction = `Generate an engaging prompt for a text-to-image AI model. This is a fine-tuned version of a diffusion model. Incorporate this trigger word: ${triggerWord}`;
  }

  const { object: promptObject } = await generateObject({
    model: google("gemini-1.5-flash-latest"),
    prompt: promptInstruction,
    schema: z.object({
      prompt: z.string().describe("The prompt to generate an image from"),
    }),
    temperature: 0.3,
  })

  return promptObject;
}

export const getTriggerWord = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  return data.trigger_word;
}

export const generateExampleImage = async (requestId: string, modelType: ModelType) => {
  const result: FalModelResult = await queue.result("fal-ai/flux-lora-fast-training", {
    requestId: requestId,
  });

  const triggerWord = await getTriggerWord(result.config_file.url);

  const { prompt } = await imagine(triggerWord, modelType);

  const imageResult: FalResult = await subscribe("fal-ai/flux-lora", {
    input: {
      prompt,
      model_name: null,
      image_size: "square",
      loras: [{
        path: result.diffusers_lora_file.url,
        scale: 1
      }],
      sync_mode: true
    },
  });

  return imageResult.images[0];
}

export const getModel = async (id: string): Promise<Model> => {
  const result = await client.getObject({
      id: id,
      options: {
        showContent: true,
      }
  });

  const content = result.data!.content! as any;

  return {
      id: result.data!.objectId,
      owner: content.fields.owner,
      weights_link: content.fields.weights_link,
      trigger_word: content.fields.trigger_word,
      image_url: content.fields.image_url,
      model_type: content.fields.model_type,
  }
}

export const getKiosks = async (): Promise<string[]> => {
  const result = await client.getObject({
      id: IMAIGINE_ADDRESS,
      options: {
        showContent: true,
      }
  });

  const content = result.data!.content! as any;
  return content.fields.kiosks;
}

const kioskClient = new KioskClient({ client: client as any, network: Network.TESTNET });

export const getOwnedKiosksCaps = async (address: string): Promise<KioskOwnerCap[]> => {
  const { kioskOwnerCaps } =  await kioskClient.getOwnedKiosks({ address });
  return kioskOwnerCaps;
}

export const getKioskModels = async (kioskId: string): Promise<Model[]> => {
  const response = await kioskClient.getKiosk({
    id: kioskId,
    options: {
      withObjects: true,
      withKioskFields: true,
      withListingPrices: true,
      objectOptions: {
        showContent: true,
      }
    }
  });

  return response.items.filter((item) => item.type === `${IMAIGINE_PACKAGE_ADDRESS}::model::Model`).map((item) => {
    const content = item.data!.content! as any;

    return {
      id: item.objectId,
      owner: content.fields.owner,
      price_in_sui: Number(item.listing!.price!) / Number(MIST_PER_SUI),
      weights_link: content.fields.weights_link,
      image_url: content.fields.image_url,
      trigger_word: content.fields.trigger_word,
      model_type: content.fields.model_type,
    }
  });
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export const uploadImage = async (imageData: string): Promise<string> => {
  const [, mimeType, base64Data] = imageData.match(/^data:(.+);base64,(.+)$/) || [];

  if (!mimeType || !base64Data) {
    throw new Error('Invalid image data format');
  }

  const fileName = `public/${nanoid(10)}.${mimeType.split('/')[1]}`;
  const fileData = decode(base64Data);

  await supabase
    .storage
    .from("images")
    .upload(fileName, fileData, {
      contentType: mimeType,
      upsert: true,
    });

  const { data: publicUrlData } = supabase
    .storage
    .from("images")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl!;
}

export const getPrice = async (): Promise<number> => {
  const response = await fetch("https://api.binance.com/api/v3/avgPrice?symbol=SUIUSDT");
  const data = await response.json();
  return Number(data.price);
}
