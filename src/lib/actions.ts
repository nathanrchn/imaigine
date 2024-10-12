"use server";

import { z } from "zod";
import { Model } from "./utils";
import { generateObject } from "ai";
import { SUI_NETWORK } from "./consts";
import { google } from "@ai-sdk/google";
import { SuiClient } from "@mysten/sui/client";
import { getFullnodeUrl } from "@mysten/sui/client";

const client = new SuiClient({ url: getFullnodeUrl(SUI_NETWORK) });

export const imagine = async (model: Model) => {
    const { object: promptObject } = await generateObject({
        model: google("gemini-1.5-flash-latest"),
        prompt: "Generate a good prompt for a text to image ai model. This is a fine tuned version of a diffusion model. Use this trigger word: " + model.trigger_word,
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
        creator: content.fields.creator,
        image_url: content.fields.image_url,
        price: undefined,
        weights_link: content.fields.weights_link,
        trigger_word: content.fields.trigger_word,
    }
}
