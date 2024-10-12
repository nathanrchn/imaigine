"use server";

import { z } from "zod";
import { Model } from "./utils";
import { generateObject } from "ai";
import { IMAIGINE_ADDRESS, SUI_NETWORK } from "./consts";
import { google } from "@ai-sdk/google";
import { SuiClient } from "@mysten/sui/client";
import { getFullnodeUrl } from "@mysten/sui/client";
import { KioskClient, KioskOwnerCap, Network } from "@mysten/kiosk";

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
