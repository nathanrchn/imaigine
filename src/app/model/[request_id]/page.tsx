"use client";

import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { getTriggerWord } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { queue } from "@fal-ai/serverless-client";
import { useSearchParams } from "next/navigation";
import { ToastAction } from "@/components/ui/toast";
import { Progress } from "@/components/ui/progress";
import { Transaction } from "@mysten/sui/transactions";
import { FalModelResult, ModelType } from "@/lib/utils";
import { FalStream } from "@fal-ai/serverless-client/src/streaming";
import { IMAIGINE_PACKAGE_ADDRESS, SUI_NETWORK } from "@/lib/consts";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { InProgressQueueStatus, QueueStatus } from "@fal-ai/serverless-client/src/types";

export default function ModelPage({ params: { request_id } }: { params: { request_id: string } }) {
  const client = useSuiClient();
  const [process, setProcess] = useState(0);
  const [finished, setFinished] = useState(false);

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

  useEffect(() => {
    console.log("Model Type:", modelType);
  }, [modelType]);

  const streamStatusPromise: Promise<FalStream<unknown, QueueStatus>> = queue.streamStatus("fal-ai/flux-lora-fast-training", {
    requestId: request_id,
    logs: true
  });

  streamStatusPromise.then((streamStatus) => {
    streamStatus.on("data", (data: InProgressQueueStatus) => {
      if (data.logs.length > 0) {
        const lastLog = data.logs[data.logs.length - 1];
        const percentageMatch = lastLog.message.match(/\d+%/);
        if (percentageMatch) {
          const percentage = parseInt(percentageMatch[0].replace("%", ""));
          setProcess(percentage);
        }
      }
    });

    streamStatus.on("done", (data: QueueStatus) => {
      setProcess(100);
      setFinished(true);
    });
  });

  const mintModelNft = async () => {
    const result: FalModelResult = await queue.result("fal-ai/flux-lora-fast-training", {
      requestId: request_id,
    });

    const triggerWord = await getTriggerWord(result.config_file.url);

    const tx = new Transaction();

    tx.moveCall({
      target: `${IMAIGINE_PACKAGE_ADDRESS}::model::create`,
      arguments: [
        tx.pure.string(result.diffusers_lora_file.url),
        tx.pure.string(triggerWord),
        tx.pure.vector("vector<string>", [])
      ]
    })

    signAndExecuteTransaction({ transaction: tx }, { onSuccess: (result) => {
      const objectId = result.objectChanges?.filter((change) => change.type === "created")[0].objectId;
      toast({
        title: "NFT Minted",
        description: "Your NFT has been minted.",
        variant: "default",
        action: objectId ? <ToastAction altText="View in explorer" asChild><Link href={`https://${SUI_NETWORK}.suivision.xyz/object/${objectId}`}>View in explorer</Link></ToastAction> : undefined
      });
    }});
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Model Training</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Request Details</h2>
            <p className="text-sm text-muted-foreground mb-1">
              <span className="font-medium">ID:</span> {request_id}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Type:</span> {modelType}
            </p>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-2">Training Progress</h2>
            <Progress value={process} className="mb-2" />
            <p className="text-sm text-muted-foreground">{process}% Complete</p>
          </div>
        </div>

        {finished ? (
          <div className="text-center">
            <p className="text-lg font-semibold mb-4">Training Complete!</p>
            <Button onClick={mintModelNft} className="w-full md:w-auto">
              Mint Model NFT
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg font-semibold mb-4">Training in progress...</p>
          </div>
        )}
      </div>
    </div>
  )
}