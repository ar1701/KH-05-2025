// if (process.env.NODE_ENV !== "production") {
//     require("dotenv").config();
//   }
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const fs = require("fs");

// const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// // Converts local file information to base64
// function fileToGenerativePart(path, mimeType) {
//   return {
//     inlineData: {
//       data: Buffer.from(fs.readFileSync(path)).toString("base64"),
//       mimeType
//     },
//   };
// }

// async function run() {
//   const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

//   const prompt = "What is this image about? And what kind of waste is this ?";   
//   const imageParts = [
//     fileToGenerativePart("uploads/77c4d8be-9b45-468b-ba5e-c1f33118501d.jpeg", "image/jpeg")
//   ];

//   const generatedContent = await model.generateContent([prompt, ...imageParts]);
  
//   console.log(generatedContent.response.text());
// }

// run();


function formatToBulletPoints(text) {
    // Ensure bullet points are formatted properly
    let formattedText = text
        .replace(/\* \*\*(.*?)\*\*:/g, '\n- **$1:**') // Fix headers
        .replace(/\* /g, '\n- '); // Ensure new bullet points
    
    return formattedText.trim();
}

// Example input text (incorrectly formatted)
const inputText = "Here's a classification of the image based on your request: * **Biodegradable/Non-biodegradable/Hazardous:** Non-biodegradable * **Type of Waste:** Plastic waste (specifically, a ripped plastic wrapper or packaging) * **Appropriate Bin:** Recycling bin (if your local recycling program accepts plastic film; otherwise, designated plastic waste bin or trash) * **Proper Method for Decomposition:** This waste will not decompose naturally. It requires industrial recycling processes to be broken down into reusable materials. If not recycled, it will persist in the environment for a very long time.";

// Formatting the text
const formattedOutput = formatToBulletPoints(inputText);
console.log(formattedOutput);

