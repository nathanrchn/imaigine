import { customAlphabet } from "nanoid";
import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";

export const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 5);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function colorFromAddress(address: string): string {
  const colors = [
    "#F87171", // red-500
    "#FBBF24", // orange-500
    "#FCD34D", // yellow-500
    "#4ADE80", // green-500
    "#3B82F6", // blue-500
  ];

  return colors[parseInt(address.slice(0, 8), 16) % colors.length];
}

export type ModelType = "people" | "style" | "other";

export type Model = {
  id: string;
  owner: string;
  weights_link: string;
  trigger_word: string;
  image_url: string;
  model_type: ModelType;
  price?: number;
}

export type FalFile = {
  content_type: string;
  file_name: string;
  file_size: number;
  url: string;
}

export type FalModelResult = {
  config_file: FalFile;
  diffusers_lora_file: FalFile;
}

export type FalResult = {
  images: {
    url: string;
    width: number;
    height: number;
    content_type: string;
  }[];
  timings: {
    inference: number;
  };
  seed: number;
  has_nsfw_content: boolean[];
  prompt: string;
}
