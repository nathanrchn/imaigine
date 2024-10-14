"use client";

import JSZip from "jszip";
import Link from "next/link";
import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import { toast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { ModelType, nanoid } from "@/lib/utils";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { Loader2, Moon, Sun } from "lucide-react";
import { Transaction } from "@mysten/sui/transactions";
import { storage, queue } from "@fal-ai/serverless-client";
import { EnqueueResult } from "@fal-ai/serverless-client/src/types";
import { FINE_TUNE_PRICE_IN_USDT, VAULT_ADDRESS } from "@/lib/consts";
import { ConnectButton, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "./ui/dialog";
import { getPrice } from "@/lib/actions";

const uploadImages = async (images: File[]): Promise<string> => {
  const zip = new JSZip();
  await Promise.all(images.map(async (image) => {
    const data = await image.arrayBuffer();
    zip.file(image.name, data);
  }));
  const compressedImagesBlob = await zip.generateAsync({ type: "blob" });
  const compressedImagesUrl = await storage.upload(compressedImagesBlob);
  return compressedImagesUrl;
}

const startTraining = async (images: string, triggerWord: string, modelType: ModelType): Promise<EnqueueResult> => {
  const response: EnqueueResult = await queue.submit("fal-ai/flux-lora-fast-training", {
    input: {
      images_data_url: images,
      create_masks: true,
      iter_multiplier: 1,
      trigger_word: triggerWord,
      is_style: modelType === "style",
    }
  });

  return response;
}

export default function Header() {
  const { theme, setTheme } = useTheme();

  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [images, setImages] = useState<File[] | null>(null);
  const [imagesUploading, setImagesUploading] = useState(false);
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [modelType, setModelType] = useState<ModelType>("style");

  useEffect(() => {
    setMounted(true);
  }, []);

  const submit = async () => {
    if (!images) {
      toast({ title: "No images uploaded", variant: "destructive", duration: 1000 });
      return;
    }

    const suiusdtPrice = await getPrice();
    const triggerWord = nanoid();

    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [BigInt(suiusdtPrice * FINE_TUNE_PRICE_IN_USDT) * MIST_PER_SUI])
    tx.transferObjects([coin], VAULT_ADDRESS)

    signAndExecuteTransaction({ transaction: tx }, { onSuccess: async () => {
      setImagesUploading(true);
      const imagesUrl = await uploadImages(images);
      const result = await startTraining(imagesUrl, triggerWord, modelType);
      setImagesUploading(false);
      setImages(null);

      setDialogOpen(false);
      router.push(`/model/${result.request_id}?type=${modelType}`);
    }});
  }

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <div className="flex items-center justify-between w-full p-4">
      <div className="flex items-center w-1/2 ml-4">
        <Link href="/">
          <h1 className="text-2xl font-bold">Imaigine</h1>
        </Link>
      </div>
      <div className="flex items-center justify-end w-1/2 mr-4">
        <div className="flex justify-between pr-4">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Create</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Training</DialogTitle>
              <DialogDescription>Fine tune your own model</DialogDescription>
              <div className="flex flex-col gap-4 mt-4">
                <div>
                  <Label htmlFor="model-type">Model Type</Label>
                  <Select
                    value={modelType}
                    onValueChange={(value) => setModelType(value as ModelType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="people">People</SelectItem>
                      <SelectItem value="style">Style</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="picture">Upload images</Label>
                  <Input
                    id="picture"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setImages(e.target.files ? Array.from(e.target.files) : null)}
                    disabled={imagesUploading}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={submit} disabled={imagesUploading}>
                  {imagesUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {imagesUploading ? "Uploading..." : "Start training"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <ConnectButton />
        {mounted && (
           <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="ml-2"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon className="h-[1.2rem] w-[1.2rem]" />
            ) : (
              <Sun className="h-[1.2rem] w-[1.2rem]" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
