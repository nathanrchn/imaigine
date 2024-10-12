"use client";

import { Model } from "@/lib/utils";
import { useEffect, useState } from "react";
import { KioskOwnerCap } from "@mysten/kiosk";
import ModelCard from "@/components/model-card";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { Separator } from "@/components/ui/separator";
import { Transaction } from "@mysten/sui/transactions";
import { getKioskModels, getKiosks, getOwnedKiosksCaps } from "@/lib/actions";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { IMAIGINE_ADDRESS, IMAIGINE_PACKAGE_ADDRESS, MODEL_TRANSFER_POLICY_ADDRESS } from "@/lib/consts";

export default function Home() {
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const [models, setModels] = useState<Model[]>([]);
  const [modelToKiosk, setModelToKiosk] = useState<Record<string, string>>({});
  const [personalModels, setPersonalModels] = useState<Model[]>([]);
  const [ownedKiosksCaps, setOwnedKiosksCaps] = useState<KioskOwnerCap[]>([]);
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
    const fetchModels = async () => {
      const kiosks = await getKiosks();
      const allModels: Model[] = [];
      const kioskMap: Record<string, string> = {};

      for (const kiosk of kiosks) {
        const kioskModels = await getKioskModels(kiosk);
        allModels.push(...kioskModels);
        kioskModels.forEach((model) => {
          kioskMap[model.id] = kiosk;
        });
      }

      setModels(allModels);
      setModelToKiosk(kioskMap);
    };

    fetchModels();
  }, []);

  useEffect(() => {
    if (!currentAccount) return;

    getOwnedKiosksCaps(currentAccount.address).then((caps) => {
      setOwnedKiosksCaps(caps);
    });
  }, [currentAccount]);

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
        owner: content.fields.owner,
        image_url: content.fields.image_url,
        weights_link: content.fields.weights_link,
        trigger_word: content.fields.trigger_word,
        model_type: content.fields.model_type,
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

    let kiosk: any;
    let cap: any;

    if (ownedKiosksCaps.length === 0) {
      const [newKiosk, newCap] = tx.moveCall({
        target: `${IMAIGINE_PACKAGE_ADDRESS}::imaigine::new_kiosk`,
        arguments: [
          tx.object(IMAIGINE_ADDRESS),
        ]
      });

      kiosk = newKiosk;
      cap = newCap;
    }

    tx.moveCall({
      target: `${IMAIGINE_PACKAGE_ADDRESS}::model::publish_model`,
      arguments: [
        tx.object(id),
      ]
    })

    tx.moveCall({
      target: `${IMAIGINE_PACKAGE_ADDRESS}::imaigine::publish_model`,
      arguments: [
        tx.object(id),
        tx.pure.u64(price),
        ownedKiosksCaps.length > 0 ? tx.object(ownedKiosksCaps[0].kioskId) : kiosk,
        ownedKiosksCaps.length > 0 ? tx.object(ownedKiosksCaps[0].objectId) : cap,
      ]
    })

    if (ownedKiosksCaps.length === 0) {
      tx.transferObjects([kiosk], currentAccount!.address);
      tx.transferObjects([cap], currentAccount!.address);
    }

    signAndExecuteTransaction({ transaction: tx });
  }

  const buyModel = (id: string, price: number) => {
    const tx = new Transaction();

    const [coin] = tx.splitCoins(tx.gas, [BigInt(price) * MIST_PER_SUI])

    const model = tx.moveCall({
      target: `${IMAIGINE_PACKAGE_ADDRESS}::imaigine::buy_model`,
      arguments: [
        tx.pure.address(id),
        tx.object(modelToKiosk[id]),
        coin,
        tx.object(MODEL_TRANSFER_POLICY_ADDRESS),
      ]
    })

    tx.moveCall({
      target: `${IMAIGINE_PACKAGE_ADDRESS}::model::set_owner`,
      arguments: [
        model,
        tx.pure.address(currentAccount!.address),
      ]
    })

    tx.transferObjects([model], currentAccount!.address);

    signAndExecuteTransaction({ transaction: tx });
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
