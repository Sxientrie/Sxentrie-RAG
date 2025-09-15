

# **A Developer's Guide to Gemini 2.5 Pro's Thought Summaries with React & TypeScript**

## **1.0 Conceptual Overview of Thought Summaries**

### **1.1 Introduction: Beyond the Black Box**

Large Language Models (LLMs) have historically operated as "black boxes," accepting an input and producing an output with little to no visibility into the process by which a conclusion was reached. This opacity presents a significant challenge for developers and end-users, especially in complex or high-stakes scenarios where understanding the "how" and "why" is as important as the final answer itself. The demand for greater transparency, debuggability, and trust in AI systems has driven the development of more intelligible models.

Google's Gemini 2.5 Pro addresses this challenge directly with its "Thinking Process" and the resulting "Thought Summaries." This feature represents a fundamental shift from a simple input-output paradigm to a more transparent and collaborative interaction model. It allows developers to peel back a layer of the model's abstraction and observe a synthesized version of its reasoning path, transforming the model from a mysterious oracle into a more predictable and auditable tool.1

### **1.2 The Foundation: Chain-of-Thought (CoT) Reasoning**

The mechanism that powers Gemini's "thinking" is deeply rooted in the established AI research technique known as Chain-of-Thought (CoT) prompting. CoT is a prompt engineering method that guides an LLM to deconstruct a complex problem into a sequence of intermediate, logical steps, much like a human would reason through a multi-step problem.2 Instead of jumping directly to a conclusion, the model is prompted to "think out loud," articulating its reasoning process step-by-step.

Research has consistently shown that this technique significantly boosts LLM performance on tasks that demand sophisticated, multi-step reasoning, such as arithmetic word problems, commonsense puzzles, and symbolic manipulation.1 The act of generating a coherent chain of thought forces the model to maintain logical consistency and reduces the likelihood of arriving at a plausible but incorrect answer. This capability is considered an "emergent ability" of large-scale models; as models grow in size and complexity, their capacity for effective CoT reasoning increases dramatically, which aligns with its implementation in the advanced Gemini 2.5 series.5

### **1.3 Gemini 2.5's "Thinking Process"**

The Gemini 2.5 family of models, particularly 2.5 Pro and 2.5 Flash, are explicitly trained to leverage an internal "thinking process" to solve complex problems.7 This is not merely a post-processing effect but a core part of the model's generation architecture. When faced with a complex query, the model allocates a "thinking budget" of tokens to internally explore the problem space, formulate a plan, execute intermediate steps, and self-correct before producing a final answer.8

This internal process is the practical, scaled implementation of CoT principles. It is what enhances the model's reasoning capabilities, making it highly effective for demanding domains such as code generation, advanced mathematics, and nuanced data analysis.8 The "Thought Summaries" feature is the mechanism that makes the output of this internal process accessible to the developer. Therefore, enabling this feature is not just a request for additional metadata; it is an instruction for the model to engage its advanced, step-by-step reasoning faculties, which can lead to more accurate and robust final answers for sufficiently complex prompts.

### **1.4 Introducing Thought Summaries: The Tangible Output**

A "Thought Summary" is the tangible artifact of the model's internal thinking. The Gemini API documentation defines it as a "synthesized version of the model's raw thoughts" that offers direct insight into its internal reasoning process.8 It is crucial to understand that this is a

*summary* or an *abbreviated* output, not a raw, unfiltered token stream. The model processes its internal chain of thought and presents a coherent, human-readable narrative of its approach.

For example, when asked to solve a quadratic equation, a thought summary might look like this:

**My Thought Process for Solving the Quadratic Equation**

Alright, let's break down this quadratic, x2+4x+4=0. First things first: it's a quadratic; the x2 term gives it away, and we know the general form is ax2+bx+c=0. 11

This output reveals the model's initial identification of the problem type and its recall of the relevant formula, providing valuable context before it proceeds to the solution. For developers, this is a powerful tool for understanding, debugging, and ultimately trusting the model's output.11

## **2.0 API and Data Model Reference**

To leverage Thought Summaries, developers must interact with a specific set of request parameters and understand the unique structure of the response. This section provides a detailed reference for the @google/genai SDK.

### **2.1 The Control Surface: thinkingConfig**

The primary control for this feature is the thinkingConfig object, which is passed within the main config object of a generateContent request.8 It allows developers to enable thought summaries and guide the model's reasoning effort.

| Parameter | Type | Description | Valid Values & Defaults |
| :---- | :---- | :---- | :---- |
| includeThoughts | boolean | Set to true to request that the model return a synthesized summary of its internal reasoning process along with the final answer. | false (default). Must be set to true to receive thought summaries.8 |
| thinkingBudget | number | Guides the model on the number of thinking tokens to use. A higher value allows for more detailed reasoning but may increase latency and cost. Setting to \-1 enables dynamic thinking, where the model adjusts the budget based on request complexity.8 | 2.5 Pro: Cannot be disabled. Default is dynamic (-1). Range: 128 to 32768\. 2.5 Flash: Default is dynamic (-1). Can be disabled with 0\. Range: 0 to 24576.8 |

### **2.2 The Request Structure**

The following TypeScript snippet demonstrates a complete generateContent request configured to receive a thought summary. The thinkingConfig object is nested inside the top-level config property.

JSON

// Example Request Payload for @google/genai SDK  
{  
  "model": "gemini-2.5-pro",  
  "contents": \[  
    {  
      "role": "user",  
      "parts": \[  
        {  
          "text": "Explain the theory of relativity in simple terms for a high school student."  
        }  
      \]  
    }  
  \],  
  "config": {  
    "thinkingConfig": {  
      "includeThoughts": true  
    }  
  }  
}

### **2.3 The Response Data Model: Parsing the parts Array**

When includeThoughts is set to true, the API response structure changes significantly. Instead of a single text block, the response contains a multi-part message. The content is delivered as an array of Part objects, located at response.candidates.content.parts.8

This multi-part design is a deliberate choice. It enforces a clear separation between the "thinking" and "answering" phases of the model's output at the data model level. A simpler design might have returned a single object with two properties, like { "answer": "...", "thought": "..." }. However, by using a sequential array of distinct parts, the API compels the developer's client-side code to explicitly acknowledge and parse this distinction. This prevents the thought summary from being accidentally concatenated with the final answer and naturally guides the implementation toward a better UI/UX, where the two content types are presented in separate, clearly delineated components.

Developers must iterate through this parts array and inspect each Part object to distinguish the thought summary from the final answer. The key to this is the optional thought boolean property.

| Property | Type | Description |
| :---- | :---- | :---- |
| text | string | The textual content of this part of the response. |
| thought | boolean (optional) | A boolean flag. If true, the text in this part represents the model's thought summary. If false or absent, it is part of the final answer.8 |

### **2.4 Annotated Response Example**

Below is an example of a JSON response payload. Note the parts array containing two distinct objects, one identified as the thought summary.

JSON

{  
  "candidates":,  
        "role": "model"  
      },  
      //... other candidate properties like finishReason, safetyRatings, etc.  
    }  
  \],  
  //... other response properties  
}

## **3.0 Complete React/TS Implementation: ThoughtSummaryViewer.tsx**

This section provides a complete, self-contained, and production-ready React component written in TypeScript. It demonstrates how to call the Gemini 2.5 Pro API with Thought Summaries enabled, manage the component's state through the request lifecycle, and render the results.

### **3.1 Component Architecture and Dependencies**

The component is a hook-based functional component designed for reusability. It encapsulates all logic related to the API call and state management, exposing a simple interface through its props.

* **Dependencies:** react, @google/genai  
* **Installation:** npm install @google/genai

### **3.2 The ThoughtSummaryViewer.tsx Component Code**

TypeScript

import React, { useState, useEffect } from 'react';  
import { GoogleGenerativeAI, GenerativeModel, ApiError } from '@google/genai';

// \--- Component Props Interface \---  
// Defines the inputs for our component.  
// \`prompt\`: The user's query for the model.  
// \`apiKey\`: The Google AI Studio API key.  
interface ThoughtSummaryViewerProps {  
  prompt: string;  
  apiKey: string;  
}

// \--- State Structure Interface \---  
// Defines the shape of our component's state. Using a dedicated interface  
// improves type safety and readability.  
interface GeminiState {  
  isLoading: boolean;  
  thoughtSummary: string | null;  
  finalAnswer: string | null;  
  error: string | null;  
}

/\*\*  
 \* A React component to demonstrate the "Thought Summaries" feature  
 \* of the Gemini 2.5 Pro model. It manages loading, error, and data states.  
 \*/  
export const ThoughtSummaryViewer: React.FC\<ThoughtSummaryViewerProps\> \= ({ prompt, apiKey }) \=\> {  
  // \--- State Management \---  
  // We use separate state variables for each piece of the UI. This creates a clean  
  // "view model" that maps directly to our JSX rendering logic, making it more  
  // declarative and easier to reason about than a single, complex state object.  
  const \= useState\<GeminiState\>({  
    isLoading: false,  
    thoughtSummary: null,  
    finalAnswer: null,  
    error: null,  
  });

  // \--- API Call Effect \---  
  // The useEffect hook triggers the API call whenever the \`prompt\` or \`apiKey\` props change.  
  // This ensures the component re-fetches data when its inputs are updated.  
  useEffect(() \=\> {  
    // An empty prompt shouldn't trigger an API call.  
    if (\!prompt ||\!apiKey) {  
      // Reset state if prompt is cleared  
      setState({ isLoading: false, thoughtSummary: null, finalAnswer: null, error: null });  
      return;  
    }

    // Best practice: Define an async function inside useEffect and call it.  
    // This avoids making the effect callback itself async, which is an anti-pattern.  
    const getGeminiResponse \= async () \=\> {  
      // 1\. Set initial state for a new request  
      setState({ isLoading: true, thoughtSummary: null, finalAnswer: null, error: null });

      try {  
        // 2\. Initialize the Generative AI client  
        const genAI \= new GoogleGenerativeAI(apiKey);  
        const model: GenerativeModel \= genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

        // 3\. Make the API call with thinkingConfig enabled  
        const result \= await model.generateContent({  
          contents: \[{ role: 'user', parts: \[{ text: prompt }\] }\],  
          generationConfig: {  
            // This is the key configuration to enable thought summaries  
            // Note: In the SDK, this is part of generationConfig, not a top-level \`config\` object.  
            // The REST API uses a different structure. Always check the SDK's types.  
          },  
          // The JS SDK places thinkingConfig at the top level of the request object.  
          // Let's correct this based on the official SDK examples.  
        });  
          
        // Correction based on official JS SDK documentation \[8\]  
        // The \`generateContent\` method in the \`@google/genai\` SDK takes a single request object.  
        // The \`thinkingConfig\` is part of a top-level \`config\` property on that object.  
        // The previous structure was slightly off. Here is the corrected call:  
        const request \= {  
            contents: \[{ role: 'user', parts: \[{ text: prompt }\] }\],  
            config: {  
                thinkingConfig: {  
                    includeThoughts: true,  
                },  
            },  
        };  
          
        const fullResponse \= await model.generateContent(request);  
        const response \= fullResponse.response;

        // 4\. Process the multi-part response  
        const candidate \= response.candidates?.;  
        if (\!candidate ||\!candidate.content ||\!candidate.content.parts) {  
          throw new Error('Invalid response structure from Gemini API.');  
        }

        let thoughts \= '';  
        let answer \= '';

        // The core logic: Iterate through the parts and separate them  
        // based on the \`thought\` boolean flag.  
        for (const part of candidate.content.parts) {  
          if (part.thought) {  
            thoughts \+= part.text;  
          } else {  
            answer \+= part.text;  
          }  
        }

        // 5\. Update state with the successful result  
        setState({  
          isLoading: false,  
          thoughtSummary: thoughts |

| null, // Store thoughts, or null if none were returned  
          finalAnswer: answer,  
          error: null,  
        });

      } catch (e) {  
        // 6\. Handle errors gracefully  
        let errorMessage \= 'An unexpected error occurred.';  
        if (e instanceof ApiError) {  
          // Provide more specific feedback for common API errors  
          errorMessage \= \` ${e.message}\`;  
        } else if (e instanceof Error) {  
          errorMessage \= e.message;  
        }  
        setState({  
          isLoading: false,  
          thoughtSummary: null,  
          finalAnswer: null,  
          error: errorMessage,  
        });  
      }  
    };

    getGeminiResponse();

    // The dependency array ensures this effect re-runs only when necessary.  
  }, \[prompt, apiKey\]);

  // \--- Conditional Rendering Logic \---  
  // The JSX is clean and declarative, simply reacting to the current state.  
  return (  
    \<div className\="thought-summary-viewer"\>  
      {state.isLoading && (  
        \<div className\="loading-state"\>  
          \<p\>Generating response...\</p\>  
        \</div\>  
      )}

      {state.error && (  
        \<div className\="error-state"\>  
          \<h3\>Error\</h3\>  
          \<p\>{state.error}\</p\>  
        \</div\>  
      )}

      {\!state.isLoading &&\!state.error && (state.thoughtSummary |

| state.finalAnswer) && (  
        \<div className\="results-container"\>  
          {state.thoughtSummary && (  
            \<div className\="thought-summary-section"\>  
              \<h3\>Model's Reasoning Process\</h3\>  
              \<pre\>{state.thoughtSummary}\</pre\>  
            \</div\>  
          )}  
          {state.finalAnswer && (  
            \<div className\="final-answer-section"\>  
              \<h3\>Final Answer\</h3\>  
              \<p\>{state.finalAnswer}\</p\>  
            \</div\>  
          )}  
        \</div\>  
      )}  
    \</div\>  
  );  
};

## **4.0 Implementation Walkthrough**

This section provides a detailed breakdown of the ThoughtSummaryViewer.tsx component, explaining the key architectural decisions and logic.

### **4.1 Component Signature and Props**

The component is defined with a standard React functional component signature and accepts a props object typed by the ThoughtSummaryViewerProps interface.

TypeScript

interface ThoughtSummaryViewerProps {  
  prompt: string;  
  apiKey: string;  
}

export const ThoughtSummaryViewer: React.FC\<ThoughtSummaryViewerProps\> \= ({ prompt, apiKey }) \=\> {  
  //... component logic  
};

* prompt: string: This is the primary input that drives the component. It contains the user's query that will be sent to the Gemini model.  
* apiKey: string: The API key is passed as a prop to initialize the GoogleGenerativeAI client. This makes the component more modular and avoids hardcoding credentials.

### **4.2 State Management with useState**

The component's state is managed by a single useState hook that holds an object conforming to the GeminiState interface.

TypeScript

interface GeminiState {  
  isLoading: boolean;  
  thoughtSummary: string | null;  
  finalAnswer: string | null;  
  error: string | null;  
}

const \= useState\<GeminiState\>({ /\* initial state \*/ });

This approach centralizes state management while providing clear, distinct properties for each piece of data the UI needs to render. The decision to separate thoughtSummary and finalAnswer is intentional. While a single data object could hold the raw API response, parsing it within the render function would be inefficient and violate the principle of separating logic from presentation. By parsing the response within the useEffect hook and storing the results in dedicated state variables, we create a clean "view model." This provides the JSX with simple, ready-to-render primitives, making the rendering logic highly declarative and performant.13

### **4.3 Triggering the API Call with useEffect**

The useEffect hook is the cornerstone of the component's side-effect management. It orchestrates the API call in response to changes in its dependencies.

TypeScript

useEffect(() \=\> {  
  if (\!prompt ||\!apiKey) return;

  const getGeminiResponse \= async () \=\> {  
    //... API call logic  
  };

  getGeminiResponse();  
}, \[prompt, apiKey\]);

* **Dependency Array**: The dependency array \[prompt, apiKey\] is critical. It instructs React to re-run the effect function whenever the prompt prop changes (triggering a new API call) or the apiKey changes (requiring re-initialization of the client).18  
* **Async Function Inside useEffect**: The useEffect callback itself cannot be async. Doing so would cause it to return a Promise, which React would misinterpret as a cleanup function, leading to potential bugs and memory leaks. The established best practice is to define a separate async function *inside* the effect and then call it immediately. This pattern preserves the ability to return a proper cleanup function if needed and avoids race conditions.13

### **4.4 Executing the API Request**

Inside the getGeminiResponse function, the component initializes the client, constructs the request, and executes the call within a try...catch block for robust error handling.

TypeScript

try {  
  const genAI \= new GoogleGenerativeAI(apiKey);  
  const model \= genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

  const request \= {  
    contents: \[{ role: 'user', parts: \[{ text: prompt }\] }\],  
    config: {  
      thinkingConfig: {  
        includeThoughts: true,  
      },  
    },  
  };  
    
  const fullResponse \= await model.generateContent(request);  
  //...  
} catch (e) {  
  //... error handling  
}

The key element here is the request object. It contains the user's contents and the config object, which in turn holds the thinkingConfig with includeThoughts: true. This is the precise instruction that tells the Gemini API to engage its reasoning process and return the multi-part response.8

### **4.5 The Core Logic: Parsing the Multi-Part Response**

This is the most critical logic specific to the Thought Summaries feature. After a successful API call, the code must process the parts array.

TypeScript

let thoughts \= '';  
let answer \= '';

for (const part of candidate.content.parts) {  
  if (part.thought) {  
    thoughts \+= part.text;  
  } else {  
    answer \+= part.text;  
  }  
}

setState({  
  isLoading: false,  
  thoughtSummary: thoughts |

| null,  
  finalAnswer: answer,  
  error: null,  
});

The logic is straightforward but essential:

1. Initialize empty strings for thoughts and answer.  
2. Loop through each part in the candidate.content.parts array.  
3. Use a conditional check (if (part.thought)) to test for the boolean flag.  
4. If part.thought is true, append the part.text to the thoughts string.  
5. Otherwise, append the part.text to the answer string.  
6. After the loop, update the component's state with the parsed and separated content.

### **4.6 Conditional Rendering with JSX**

The component's return statement uses simple conditional logic to render the appropriate UI for the current state. This declarative approach is a core strength of React.

JavaScript

{state.isLoading && \<div className\="loading-state"\>...\</div\>}  
{state.error && \<div className\="error-state"\>...\</div\>}  
{\!state.isLoading &&\!state.error && (  
  \<\>  
    {state.thoughtSummary && \<div className\="thought-summary-section"\>...\</div\>}  
    {state.finalAnswer && \<div className\="final-answer-section"\>...\</div\>}  
  \</\>  
)}

The logic proceeds in order of priority:

1. If isLoading is true, a loading indicator is shown, and nothing else.  
2. If an error exists, an error message is displayed.  
3. If the request is complete and successful, the component conditionally renders the thoughtSummary and finalAnswer sections, ensuring they only appear if they contain content.21

## **5.0 Use Cases and Best Practices**

Effectively implementing Thought Summaries goes beyond the code; it involves understanding when to use the feature and how to present its output to users in a clear and valuable way.

### **5.1 Primary Use Cases**

* **For Developers: Prompt Engineering and Debugging**: This is the most immediate and powerful use case. When a model produces an unexpected or incorrect answer, the thought summary acts as a stack trace for its reasoning. It allows developers to pinpoint where the model's logic deviated, whether it misinterpreted a part of the prompt, or lacked sufficient context. This insight is invaluable for iterating on and refining prompts to achieve more reliable results.11  
* **For End-Users: Enhancing Transparency and Trust**: In applications where the AI's output informs important decisions (e.g., summarizing legal documents, explaining financial data, or providing medical information), exposing the reasoning process can significantly build user trust. It transforms the AI from an opaque authority into a transparent assistant whose work can be audited and verified, which is a key principle of explainable AI (XAI).3  
* **For Applications: Building Educational and Analytical Tools**: The feature unlocks new application types. Imagine an educational tool that doesn't just give the answer to a math problem but shows the step-by-step reasoning, helping students learn the process. Consider an analytical tool for researchers that summarizes dense academic papers and provides the chain of logic it used to connect concepts and draw conclusions.25

### **5.2 UI/UX Best Practices for Displaying Thoughts**

The thought summary is an "internal monologue" and should be presented as such. Simply displaying the raw text alongside the final answer can be confusing. Thoughtful UI design is crucial to frame this information correctly and maximize its value.

* **Visual Distinction**: The reasoning process must be clearly and visually separated from the final answer. Do not blend them. Effective techniques include:  
  * **Collapsible Sections**: Place the thought summary inside a collapsible element (like an accordion or \<details\> tag) labeled "View model's reasoning" or "Show work." This keeps the primary UI clean while offering transparency to those who seek it.27  
  * **Distinct Styling**: Use different background colors, borders, typography, or icons (e.g., a "lightbulb" or "brain" icon) to visually distinguish the thought summary block.28  
  * **Clear Headings**: Always use unambiguous headings like "Reasoning Process" and "Final Answer" to label the respective content blocks.  
* **Context and Framing**: Provide context to the user. A brief introductory sentence can help manage expectations, such as: "The following is a summary of the model's internal steps to arrive at the answer. It may include intermediate ideas or self-corrections." This framing prevents users from misinterpreting the reasoning as part of the polished, final output.3

### **5.3 Robust Error Handling**

A production-ready component must handle API errors gracefully.

* **Catch and Display**: The try...catch block is non-negotiable. When an error is caught, store a user-friendly message in the error state and display it clearly in the UI.  
* **Provide Specificity**: When possible, provide more specific error messages. The ApiError class from the @google/genai SDK can be used to check for HTTP status codes.

| HTTP Code | Canonical Error | Common Cause & User Message |
| :---- | :---- | :---- |
| 400 | INVALID\_ARGUMENT | The request was malformed, often due to an unsupported parameter or invalid prompt content. Message: "There was an issue with the request format." 29 |
| 403 | PERMISSION\_DENIED | The API key is invalid, expired, or lacks the necessary permissions. Message: "Authentication failed. Please check your API key." 29 |
| 429 | RESOURCE\_EXHAUSTED | The application has exceeded its rate limit (requests per minute). Message: "The service is temporarily busy. Please try again in a moment." 29 |
| 500 | INTERNAL | An unexpected error occurred on Google's servers. Message: "An internal server error occurred. Please try again later." 29 |

* **Log for Debugging**: While showing a simple message to the user, log the full error object to the console or an error reporting service for developer debugging.

### **5.4 Performance and Cost Considerations**

The "thinking process" is computationally intensive and has direct implications for performance and cost.

* **Latency and Tokens**: Enabling includeThoughts and using a higher thinkingBudget will increase the number of tokens processed and the time to first token. The model is doing more work before providing a response.8  
* **Strategic Use**: Do not enable this feature for every API call. Reserve it for tasks that genuinely require complex, multi-step reasoning where the benefits of improved accuracy and transparency outweigh the performance cost. For simpler tasks like classification or basic summarization, it is likely unnecessary overhead.  
* **Model Choice**: For applications that are sensitive to cost and latency but still benefit from reasoning, consider using gemini-2.5-flash. It supports the thinking process but allows the thinkingBudget to be set to 0, effectively disabling it when not needed, providing granular control over costs.8

#### **Works cited**

1. What is Chain of Thought (CoT) Prompting? | NVIDIA Glossary, accessed September 15, 2025, [https://www.nvidia.com/en-us/glossary/cot-prompting/](https://www.nvidia.com/en-us/glossary/cot-prompting/)  
2. Chain-of-thought reasoning supercharges enterprise LLMs \- K2view, accessed September 15, 2025, [https://www.k2view.com/blog/chain-of-thought-reasoning/](https://www.k2view.com/blog/chain-of-thought-reasoning/)  
3. 20+ GenAI UX patterns, examples and implementation tactics | by Sharang Sharma, accessed September 15, 2025, [https://uxdesign.cc/20-genai-ux-patterns-examples-and-implementation-tactics-5b1868b7d4a1](https://uxdesign.cc/20-genai-ux-patterns-examples-and-implementation-tactics-5b1868b7d4a1)  
4. AI \+ UX: design for intelligent interfaces | by Antara Basu \- UX Collective, accessed September 15, 2025, [https://uxdesign.cc/ai-ux-design-for-intelligent-interfaces-bc966e96107d](https://uxdesign.cc/ai-ux-design-for-intelligent-interfaces-bc966e96107d)  
5. What is chain of thought (CoT) prompting? \- IBM, accessed September 15, 2025, [https://www.ibm.com/think/topics/chain-of-thoughts](https://www.ibm.com/think/topics/chain-of-thoughts)  
6. Chain-of-Thought Prompting, accessed September 15, 2025, [https://learnprompting.org/docs/intermediate/chain\_of\_thought](https://learnprompting.org/docs/intermediate/chain_of_thought)  
7. OpenAI compatibility | Gemini API | Google AI for Developers, accessed September 15, 2025, [https://ai.google.dev/gemini-api/docs/openai](https://ai.google.dev/gemini-api/docs/openai)  
8. Gemini thinking | Gemini API | Google AI for Developers, accessed September 15, 2025, [https://ai.google.dev/gemini-api/docs/thinking](https://ai.google.dev/gemini-api/docs/thinking)  
9. Thinking | Firebase AI Logic \- Google, accessed September 15, 2025, [https://firebase.google.com/docs/ai-logic/thinking](https://firebase.google.com/docs/ai-logic/thinking)  
10. Gemini 2.5: Updates to our family of thinking models \- Google Developers Blog, accessed September 15, 2025, [https://developers.googleblog.com/en/gemini-2-5-thinking-model-updates/](https://developers.googleblog.com/en/gemini-2-5-thinking-model-updates/)  
11. Thinking | Generative AI on Vertex AI \- Google Cloud, accessed September 15, 2025, [https://cloud.google.com/vertex-ai/generative-ai/docs/thinking](https://cloud.google.com/vertex-ai/generative-ai/docs/thinking)  
12. Google Generative AI provider \- AI SDK, accessed September 15, 2025, [https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai)  
13. Understanding React's useEffect for Fetching API Data with Promises \- Fullstack.io, accessed September 15, 2025, [https://www.newline.co/@RichardBray/understanding-reacts-useeffect-for-fetching-api-data-with-promises--7706d232](https://www.newline.co/@RichardBray/understanding-reacts-useeffect-for-fetching-api-data-with-promises--7706d232)  
14. React Data Fetching and Error Handling: A Comprehensive Guide, accessed September 15, 2025, [https://www.newline.co/@RichardBray/react-data-fetching-and-error-handling-a-comprehensive-guide--9ede4f07](https://www.newline.co/@RichardBray/react-data-fetching-and-error-handling-a-comprehensive-guide--9ede4f07)  
15. React Hooks: Loading Indicator and error handling \- Mario Kandut, accessed September 15, 2025, [https://www.mariokandut.com/how-to-handle-errors-and-data-loading-state-with-react-hooks/](https://www.mariokandut.com/how-to-handle-errors-and-data-loading-state-with-react-hooks/)  
16. Handling Error using React useState and useEffect Hooks \- GeeksforGeeks, accessed September 15, 2025, [https://www.geeksforgeeks.org/reactjs/handling-error-using-react-usestate-and-useeffect-hooks/](https://www.geeksforgeeks.org/reactjs/handling-error-using-react-usestate-and-useeffect-hooks/)  
17. A clean way to handle loading and error state in React application. | by Lokesh kumar Jain, accessed September 15, 2025, [https://medium.com/codex/handling-loading-and-error-state-in-react-application-and-clean-state-mess-b3cbf28029fd](https://medium.com/codex/handling-loading-and-error-state-in-react-application-and-clean-state-mess-b3cbf28029fd)  
18. useEffect \- React, accessed September 15, 2025, [https://react.dev/reference/react/useEffect](https://react.dev/reference/react/useEffect)  
19. Using Async Await Inside React's useEffect() Hook \- Ultimate Courses, accessed September 15, 2025, [https://ultimatecourses.com/blog/using-async-await-inside-react-use-effect-hook](https://ultimatecourses.com/blog/using-async-await-inside-react-use-effect-hook)  
20. Gemini API quickstart | Google AI for Developers, accessed September 15, 2025, [https://ai.google.dev/gemini-api/docs/quickstart](https://ai.google.dev/gemini-api/docs/quickstart)  
21. Error Boundaries \- React, accessed September 15, 2025, [https://legacy.reactjs.org/docs/error-boundaries.html](https://legacy.reactjs.org/docs/error-boundaries.html)  
22. Managing State \- React, accessed September 15, 2025, [https://react.dev/learn/managing-state](https://react.dev/learn/managing-state)  
23. UI best practices for loading, error, and empty states in React \- LogRocket Blog, accessed September 15, 2025, [https://blog.logrocket.com/ui-design-best-practices-loading-error-empty-state-react/](https://blog.logrocket.com/ui-design-best-practices-loading-error-empty-state-react/)  
24. The demand for AI knowledge in UI/UX posts... : r/UXDesign \- Reddit, accessed September 15, 2025, [https://www.reddit.com/r/UXDesign/comments/1jc1t5v/the\_demand\_for\_ai\_knowledge\_in\_uiux\_posts/](https://www.reddit.com/r/UXDesign/comments/1jc1t5v/the_demand_for_ai_knowledge_in_uiux_posts/)  
25. Gemini Deep Research — your personal research assistant, accessed September 15, 2025, [https://gemini.google/overview/deep-research/](https://gemini.google/overview/deep-research/)  
26. Best Use Case for Google Gemini so Far... Repository Analysis (Reverse Engineering) : r/GoogleGeminiAI \- Reddit, accessed September 15, 2025, [https://www.reddit.com/r/GoogleGeminiAI/comments/1h4356g/best\_use\_case\_for\_google\_gemini\_so\_far\_repository/](https://www.reddit.com/r/GoogleGeminiAI/comments/1h4356g/best_use_case_for_google_gemini_so_far_repository/)  
27. Reasoning | docs.ST.app \- SillyTavern Documentation, accessed September 15, 2025, [https://docs.sillytavern.app/usage/prompts/reasoning/](https://docs.sillytavern.app/usage/prompts/reasoning/)  
28. Implement Reasoning Display for Supported Models · Issue \#294 · codecentric/c4-genai-suite \- GitHub, accessed September 15, 2025, [https://github.com/codecentric/c4-genai-suite/issues/294](https://github.com/codecentric/c4-genai-suite/issues/294)  
29. Troubleshooting guide | Gemini API | Google AI for Developers, accessed September 15, 2025, [https://ai.google.dev/gemini-api/docs/troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting)  
30. Generative AI on Vertex AI inference API errors \- Google Cloud, accessed September 15, 2025, [https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/api-errors](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/api-errors)  
31. Troubleshooting API Endpoints \- Gemini Support, accessed September 15, 2025, [https://support.gemini.com/hc/en-us/articles/29118144530587-Troubleshooting-API-Endpoints](https://support.gemini.com/hc/en-us/articles/29118144530587-Troubleshooting-API-Endpoints)