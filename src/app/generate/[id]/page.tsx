"use client";

import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastAction } from "@/components/ui/toast";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Transaction } from "@mysten/sui/transactions";
import { getModel, imagine, uploadImage } from "@/lib/actions";
import { QueueStatus, subscribe } from "@fal-ai/serverless-client";
import { colorFromAddress, FalResult, Model, ModelType } from "@/lib/utils";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { FEES_PERCENTAGE, GENERATE_PRICE_IN_SUI, IMAIGINE_PACKAGE_ADDRESS, SUI_NETWORK, VAULT_ADDRESS } from "@/lib/consts";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  prompt: z.string().min(1),
});

export default function GeneratePage({ params: { id } }: { params: { id: string } }) {
  const client = useSuiClient();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const modelType = searchParams.get("type") as ModelType;
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) => 
      await client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showObjectChanges: true,
        }
      })
  });
  
  const [hasMinted, setHasMinted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<Model | null>(null);
  const [image, setImage] = useState<FalResult | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);

  useEffect(() => {
    getModel(id).then((result) => {
      setModel(result);
    });
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
    },
  });

  const generateImage = async (diffusers_lora_file: string, prompt: string): Promise<FalResult> => {
    let currentStatus = "";
    const result: FalResult = await subscribe("fal-ai/flux-lora", {
      input: {
        prompt,
        model_name: null,
        image_size: "square_hd",
        loras: [{
          path: diffusers_lora_file,
          scale: 1
        }],
        sync_mode: true
      },
      onQueueUpdate: (update: QueueStatus) => {
        if (update.status !== currentStatus) {
          if (update.status === "IN_QUEUE") {
            toast({ title: "Queued", description: `Queue position: ${update.queue_position}`, variant: "destructive", duration: 1000 });
          } else if (update.status === "IN_PROGRESS") {
            toast({ title: "Generating", variant: "default", duration: 1000 });
          }
          currentStatus = update.status;
        }
      }
    })
    return result;
  }

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setImage(null);
    setIsLoading(true);
    setHasMinted(false);
    setLastPrompt(data.prompt);
    const tx = new Transaction();

    const [generation_coin] = tx.splitCoins(tx.gas, [BigInt(GENERATE_PRICE_IN_SUI) * MIST_PER_SUI])
    const feesAmount = BigInt(FEES_PERCENTAGE * 100) * BigInt(GENERATE_PRICE_IN_SUI) * MIST_PER_SUI / BigInt(100);
    const [use_model_coin] = tx.splitCoins(generation_coin, [feesAmount]);
    tx.transferObjects([generation_coin], VAULT_ADDRESS)
    tx.transferObjects([use_model_coin], model!.owner)

    signAndExecuteTransaction({ transaction: tx }, { onSuccess: async () => {
      client.getObject({
        id: id
      }).then(() => {
        generateImage(
          model!.weights_link,
          data.prompt
        ).then((result) => {
          setImage(result);
          setIsLoading(false);
        });
      })
    }});
  };

  const imaginePrompt = async () => {
    const promptObject = await imagine(model!.trigger_word, modelType!)
    form.setValue("prompt", promptObject.prompt)
  }

  const mintNFT = async () => {
    const image_url: string = await uploadImage(image!.images[0].url);

    const tx = new Transaction();

    tx.moveCall({
      target: `${IMAIGINE_PACKAGE_ADDRESS}::image::create`,
      arguments: [
        tx.pure.string(lastPrompt!),
        tx.pure.string(image_url),
        tx.pure.address(id),
      ]
    })

    signAndExecuteTransaction({ transaction: tx }, { onSuccess: (result) => {
      const objectId = result.objectChanges?.filter((change) => change.type === "created")[0].objectId;
      setHasMinted(true);
      toast({
        title: "NFT Minted",
        description: "Your NFT has been minted.",
        variant: "default",
        action: objectId ? <ToastAction altText="View in explorer" asChild><Link href={`https://${SUI_NETWORK}.suivision.xyz/object/${objectId}`}>View in explorer</Link></ToastAction> : undefined
      });
    }});
  }

  return (
    <div className="container mx-auto px-4 py-8 w-full">
      <div className="flex flex-col lg:flex-row w-full gap-8 h-full">
        <div className="flex flex-col justify-center lg:w-1/2 h-full">
          <div className="space-y-4 flex-grow">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="relative">
                  <FormField
                    control={form.control}
                    name="prompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prompt</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Textarea {...field} className="resize-none" rows={5} />
                            <Button type="button" disabled={isLoading} variant="outline" onClick={async () => await imaginePrompt()} className="absolute bottom-2 right-2">
                              <Sparkles className="h-4 w-4" color={colorFromAddress(id)} />
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Describe the image you want to generate.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>Generate</Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
        <div className="flex justify-center items-center lg:w-1/2">
          {isLoading ?
            <Skeleton className="w-[1024px] h-[1024px] rounded-xl" /> :
            image ? (
              <div className="relative">
                <Image src={image.images[0].url} alt="Generated Image" width={image.images[0].width} height={image.images[0].height} className="rounded-xl" />
                {!hasMinted && <Button type="button" className="absolute bottom-2 right-2" onClick={mintNFT}>Mint NFT</Button>}
              </div>
            ) :
            <div className="w-[1024px] h-[1024px]" />
          }
        </div>
      </div>
    </div>
  )
}
