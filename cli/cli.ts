import { generatePrompt } from "./core/ollama.ts";
import { SYSTEM_PROMPT } from "./core/config.ts"
async function main() {
    try {
        const response = await generatePrompt(SYSTEM_PROMPT);
        console.log(response);
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

main();
