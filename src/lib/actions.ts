"use server";

import { z } from "zod";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { SuiClient } from "@mysten/sui/client";
import { getFullnodeUrl } from "@mysten/sui/client";
import { IMAIGINE_ADDRESS, SUI_NETWORK } from "./consts";
import { queue, subscribe } from "@fal-ai/serverless-client";
import { KioskClient, KioskOwnerCap, Network } from "@mysten/kiosk";
import { FalModelResult, FalResult, Model, ModelType } from "./utils";

const client = new SuiClient({ url: getFullnodeUrl(SUI_NETWORK) });

export const imagine = async (triggerWord: string) => {
  const { object: promptObject } = await generateObject({
    model: google("gemini-1.5-flash-latest"),
    prompt: "Generate a good prompt for a text to image ai model. This is a fine tuned version of a diffusion model. Use this trigger word: " + triggerWord,
    schema: z.object({
      prompt: z.string().describe("The prompt to generate an image from"),
    }),
    temperature: 0.5,
  })

  return promptObject
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

  const { object: promptObject } = await generateObject({
    model: google("gemini-1.5-flash-latest"),
    prompt: "Generate a good prompt for a text to image ai model. This is a fine tuned version of a diffusion model. Use this trigger word: " + triggerWord,
    schema: z.object({
      prompt: z.string().describe("The prompt to generate an image from"),
    }),
    temperature: 0.5,
  })

  const prompt = promptObject.prompt;

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

  return imageResult.images[0].url;
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

  return response.items.map((item) => {
    const content = item.data!.content! as any;

    return {
      id: item.objectId,
      owner: content.fields.owner,
      price: Number(item.listing!.price!),
      weights_link: content.fields.weights_link,
      image_url: content.fields.image_url,
      trigger_word: content.fields.trigger_word,
    }
  });
}
