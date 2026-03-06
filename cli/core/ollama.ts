import { OLLAMA_URL, DEFAULT_MODEL, SYSTEM_PROMPT } from "./config.ts"

async function streamResponse() {

}

export async function generatePrompt(prompt: string): Promise<string> {


    const response = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: DEFAULT_MODEL,
            prompt: prompt,
            stream: true
        })
    });

    if (!response.ok) {
        throw new Error("Failed to Connect")
    }

    if (!response.body) {
        throw new Error("No response")
    }



    const decoder = new TextDecoder();
    let output = ""
    for await (const chunk of response.body!) {
        const decodedChunk = decoder.decode(chunk)
        for (const line of decodedChunk.split("\n")) {
            if (!line.trim()) continue;
            try {
                const chunkData = JSON.parse(line);
                if (chunkData.response) output += chunkData.response
                if (chunkData.done) return output.trim();
            } catch { }
        }

    }


    return output.trim()
}
