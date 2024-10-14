"use client";

import { z } from "zod";
import Link from "next/link";
import Avatar from "./avatar";
import Image from "next/image";
import { useState } from "react";
import { Input } from "./ui/input";
import { getExplorerUrl, Model } from "@/lib/utils";
import { Button } from "./ui/button";
import { Sparkles } from "lucide-react";
import { useForm } from "react-hook-form"
import { colorFromAddress } from "@/lib/utils";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

const formSchema = z.object({
  price: z.number().min(0, "Price must be a positive number"),
})

export default function ModelCard({ model, personal, publishModel, buyModel }: { model: Model, personal: boolean, publishModel: (id: string, price_in_sui: number) => void, buyModel: (id: string, price_in_sui: number) => void }) {
  const { id, owner, image_url, price_in_sui, model_type } = model;
  const currentAccount = useCurrentAccount();
  const [dialogOpen, setDialogOpen] = useState(false);
  const shortAddress = (address: string) => address.slice(0, 6) + "..." + address.slice(-4);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      price: 0,
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    publishModel(id, values.price);
    setDialogOpen(false);
  }

  return (
    <Card key={id}>
      <CardHeader>
        <CardTitle className="text-lg font-bold">
          <Link href={getExplorerUrl(id)} target="_blank">{shortAddress(id)}</Link>
        </CardTitle>
        <Link href={getExplorerUrl(owner, "address")} className="text-sm text-gray-500 flex items-center" target="_blank">
          <Avatar address={owner} />{shortAddress(owner)}
        </Link>
      </CardHeader>
      <CardContent>
        {image_url ? <Image src={image_url} alt="Model Image" width={300} height={300} className="w-full h-auto object-cover rounded-md" priority /> : <div className="mx-auto h-[300px] w-[300px] object-cover rounded-md bg-gray-200" />}
      </CardContent>
      <CardFooter className="flex-1 justify-between">
        <Link href={currentAccount ? `/generate/${id}?type=${model_type}` : {}}>
          <Button className="ml-2" variant="outline" disabled={!currentAccount} >
            <Sparkles className="mr-2 h-4 w-4" color={colorFromAddress(id)} />Try this model
          </Button>
        </Link>
        {price_in_sui !== undefined && price_in_sui !== null && (
          <Button className="mr-2 text-[#597fff] font-bold" variant="outline" disabled={!currentAccount} onClick={() => buyModel(id, price_in_sui)}>
            Buy it for {price_in_sui} SUI
          </Button>
        )}
        {!price_in_sui && personal && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mr-2 text-[#597fff] font-bold" variant="outline" disabled={!currentAccount}>
                Publish Model
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Publish Model</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit">Publish</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </CardFooter>
    </Card>
  )
}
