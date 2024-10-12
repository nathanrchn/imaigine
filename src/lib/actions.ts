"use server";

export const getTriggerWord = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json();
    return data.trigger_word;
}
