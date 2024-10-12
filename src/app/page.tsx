"use client";

import { Model } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getKioskModels } from "@/lib/actions";
import ModelCard from "@/components/model-card";
import { Separator } from "@/components/ui/separator";
import { Transaction } from "@mysten/sui/transactions";
import { IMAIGINE_ADDRESS, IMAIGINE_PACKAGE_ADDRESS, KIOSK_ID } from "@/lib/consts";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";

export default function Home() {
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const [models, setModels] = useState<Model[]>([]);
  const [personalModels, setPersonalModels] = useState<Model[]>([]);
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
    getKioskModels("").then((models) => {
      setModels(models);
    });
  }, []);

  const getPersonalModels = async (): Promise<Model[]> => {
    if (!currentAccount) return [];

    const res = await client.getOwnedObjects({
      owner: currentAccount.address,
      filter: {
        MoveModule: {
          module: "model",
          package: IMAIGINE_PACKAGE_ADDRESS
        }
      }
    });

    const objects = await client.multiGetObjects({
      ids: res.data.map((obj) => obj.data!.objectId),
      options: {
        showContent: true,
      }
    });

    return objects.map((obj) => {
      const content = obj.data!.content! as any;

      return {
        id: obj.data!.objectId,
        creator: content.fields.creator,
        image_url: content.fields.image_url,
        weights_link: content.fields.config.fields.weights_link,
        trigger_word: content.fields.config.fields.trigger_word,
      };
    });
  }

  useEffect(() => {
    getPersonalModels().then((models) => {
      setPersonalModels(models);
    });
  }, [currentAccount]);

  const publishModel = (id: string, price: number) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${IMAIGINE_PACKAGE_ADDRESS}::model::list_model`,
      arguments: [
        tx.object(id),
      ]
    })

    tx.moveCall({
      target: `${IMAIGINE_PACKAGE_ADDRESS}::main::place_and_list`,
      arguments: [
        tx.object(id),
        tx.pure.u64(price),
        tx.object(KIOSK_ID),
        tx.object(IMAIGINE_ADDRESS),
      ]
    })

    signAndExecuteTransaction({ transaction: tx }, { onSuccess: () => {
      getPersonalModels().then((models) => {
        setPersonalModels(models);
      });

      getKioskModels("").then((models) => {
        setModels(models);
      });
    }});
  }

  const buyModel = (id: string) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${IMAIGINE_PACKAGE_ADDRESS}::main::buy_model`,
      arguments: [
        tx.pure.address(id),
        tx.object(KIOSK_ID),
        tx.object(IMAIGINE_ADDRESS),
      ]
    })

    signAndExecuteTransaction({ transaction: tx }, { onSuccess: () => {
      getPersonalModels().then((models) => {
        setPersonalModels(models);
      });

      getKioskModels("").then((models) => {
        setModels(models);
      });
    }});
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {currentAccount && personalModels.length > 0 && (
        <div>
          <h1 className="text-2xl font-bold mb-4">Unpublished Models</h1>
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {personalModels.map((model) => (
              <ModelCard key={model.id} model={model} personal={true} publishModel={publishModel} buyModel={buyModel} />
            ))}
          </div>
        </div>
      )}
      {currentAccount && personalModels.length > 0 && models.length > 0 && <Separator className="my-8" />}
      {models.length > 0 && (
        <div>
          <h1 className="text-2xl font-bold mb-4">Public Models</h1>
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((model) => (
              <ModelCard key={model.id} model={model} personal={false} publishModel={publishModel} buyModel={buyModel} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
