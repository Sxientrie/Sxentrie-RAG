

# **OVERVIEW.md**

## **1.0 Introduction**

The Gemini 2.5 series of models, encompassing Gemini 2.5 Pro and Gemini 2.5 Flash, represents a significant milestone in the evolution of large-scale, multimodal artificial intelligence systems. This series is the culmination of a multi-year research and development program, building upon the foundations laid by previous generations, including Gemini 1.0, 1.5, and 2.0. The program's trajectory has been characterized by rapid advancements in core capabilities, initially focusing on expanding context windows and enhancing multimodal reasoning across text, images, code, and other data formats.1 The Gemini 2.5 series marks a fundamental architectural shift, moving beyond incremental scaling to a re-engineered design that natively integrates advanced reasoning, long-context processing, and multimodal understanding from the ground up.1

Concurrent with this model evolution, a strategic consolidation of the developer ecosystem has been undertaken, resulting in the introduction of the @google/genai Software Development Kit (SDK). This new SDK is designed to provide a unified, production-ready interface for all of Google's generative AI models, offering a streamlined and consistent developer experience.3 This initiative addresses the fragmentation of previous libraries and establishes a single, clear path for developers building applications on the Gemini platform. The legacy libraries, such as

@google/generativeai for JavaScript/TypeScript and google-generativeai for Python, are now officially on a deprecation path, with all support scheduled to end on November 30th, 2025\.4 This transition is not merely a change in package names but reflects a deeper architectural evolution from a model-centric to a client-centric API interaction pattern. Previously, developers would instantiate model-specific objects; now, all interactions are managed through a central

Client object, which serves as a single entry point for all API services, including models, chat sessions, and file management.3 This approach centralizes configuration, simplifies credential management, and creates a more scalable and maintainable API surface for complex applications.3

The key technical advancements of the Gemini 2.5 series can be distilled into three foundational pillars that collectively enable a new generation of sophisticated AI applications:

1. **Sparse Mixture-of-Experts (MoE) Architecture:** Both Gemini 2.5 Pro and Flash are built on a sparse MoE transformer architecture.7 This advanced design decouples the model's total parameter count from the computational cost of inference. For any given input token, a routing mechanism dynamically activates only a relevant subset of "expert" sub-networks. This allows the models to achieve the performance and knowledge capacity of a much larger, dense model while maintaining significantly lower latency and computational overhead, a critical factor for both cost-efficiency and real-time application performance.1  
2. **Expansive 1 Million Token Context Window:** The series features a massive 1 million token context window, enabling the processing of vast amounts of information in a single prompt.11 This capacity is equivalent to approximately 50,000 lines of code, eight full-length novels, or over three hours of video content.12 This capability fundamentally changes the paradigm for many tasks, such as long-document analysis, codebase comprehension, and video summarization, often obviating the need for complex workarounds like Retrieval-Augmented Generation (RAG) for certain use cases.12  
3. **Natively Multimodal Design:** Unlike models where multimodality is an add-on, the Gemini 2.5 series was designed from the ground up to be natively multimodal.2 The models process and reason over interleaved text, images, audio, and video within a single, unified architecture.8 This integrated approach allows for a deeper and more nuanced understanding of complex, multi-format inputs, enabling sophisticated use cases like generating code from visual diagrams, answering detailed questions about video content, and performing conversational image editing.15

The following table provides a definitive schedule for the transition from legacy libraries to the unified @google/genai SDK and its equivalents in other languages.

| Language | Legacy Library Package | Recommended Library | End-of-Support Date |
| :---- | :---- | :---- | :---- |
| Python | google-generativeai | google-genai | November 30, 2025 |
| JavaScript/TypeScript | @google/generativeai | @google/genai | November 30, 2025 |
| Go | google.golang.org/generative-ai | google.golang.org/genai | November 30, 2025 |
| Dart/Flutter | google\_generative\_ai | Not Actively Maintained | N/A |
| Swift | generative-ai-swift | Not Actively Maintained | N/A |
| Android | generative-ai-android | Not Actively Maintained | N/A |

Data sourced from.4

## **2.0 Model Naming and Initialization**

Correctly identifying and initializing the desired model is the foundational step for any interaction with the Gemini API. The Gemini 2.5 series offers a range of models, each optimized for different performance characteristics, cost profiles, and use cases. These models are accessible via specific, case-sensitive string identifiers. The choice of model identifier dictates the capabilities available for a given API request, including support for features like advanced reasoning, image generation, or real-time interaction.

The following table provides an exhaustive list of the official model identifiers for the Gemini 2.5 series, their current release status, and their primary areas of optimization. Senior engineers should use this table as the canonical reference when specifying the model parameter in SDK calls to ensure requests are routed to the appropriate system.

| Model Name | Official Identifier | Status | Key Optimizations |
| :---- | :---- | :---- | :---- |
| Gemini 2.5 Pro | gemini-2.5-pro | General Availability (GA) | Enhanced thinking and reasoning, multimodal understanding, advanced coding. |
| Gemini 2.5 Flash | gemini-2.5-flash | General Availability (GA) | Adaptive thinking, optimal balance of price and performance. |
| Gemini 2.5 Flash-Lite | gemini-2.5-flash-lite | General Availability (GA) | Most cost-efficient model, optimized for high-throughput tasks. |
| Gemini 2.5 Flash Image | gemini-2.5-flash-image-preview | Preview | Precise, conversational image generation and editing. |
| Gemini 2.5 Flash Live | gemini-live-2.5-flash-preview | Preview | Low-latency bidirectional voice and video interactions via the Live API. |
| Gemini 2.5 Flash Native Audio | gemini-2.5-flash-preview-native-audio-dialog | Preview | High-quality, natural conversational audio output. |
| Gemini 2.5 Pro TTS | gemini-2.5-pro-preview-tts | Preview | High-fidelity, controllable, multi-speaker text-to-speech generation. |

Data sourced from.18

### **2.1 SDK Initialization in TypeScript**

The @google/genai SDK is designed with a flexible initialization pattern that abstracts the underlying API backend, allowing developers to target either the Gemini Developer API (via Google AI Studio) or the enterprise-grade Gemini API on Vertex AI. This choice is a critical architectural decision, as it determines the authentication mechanism, available features, and operational environment. The following production-ready TypeScript code provides a robust pattern for initializing the SDK client, managing environment variables, and handling potential configuration errors.

The code demonstrates instantiating the GoogleGenAI client, which serves as the central access point for all SDK functionalities. It reads configuration from environment variables, a best practice for managing sensitive credentials and deployment-specific settings. The logic explicitly checks for the GOOGLE\_GENAI\_USE\_VERTEXAI flag to determine which backend to target. If this flag is set to "true", it proceeds with Vertex AI initialization, requiring GOOGLE\_CLOUD\_PROJECT and GOOGLE\_CLOUD\_LOCATION. This path uses Application Default Credentials (ADC), which is the standard authentication method for Google Cloud environments, leveraging IAM roles and service accounts.21 If the flag is not set, it defaults to the Gemini Developer API, which relies on a

GOOGLE\_API\_KEY.3 This dual-path approach allows the same application codebase to be used for local prototyping (with an API key) and production deployment on Google Cloud (with ADC).

TypeScript

// Filename: geminiClient.ts  
// Description: A production-ready module for initializing the @google/genai SDK client.  
// It supports both Gemini Developer API and Vertex AI backends via environment variables.

import { GoogleGenAI } from "@google/genai";

// Define an interface for the configuration to ensure type safety.  
interface GeminiClientConfig {  
  useVertexAI: boolean;  
  apiKey?: string;  
  gcpProject?: string;  
  gcpLocation?: string;  
}

/\*\*  
 \* Retrieves and validates the necessary configuration from environment variables.  
 \* This function centralizes configuration management and throws specific errors  
 \* for missing variables, which aids in debugging deployment issues.  
 \*  
 \* @returns {GeminiClientConfig} A validated configuration object.  
 \* @throws {Error} If required environment variables are not set.  
 \*/  
function getClientConfig(): GeminiClientConfig {  
  const useVertexAI \= process.env.GOOGLE\_GENAI\_USE\_VERTEXAI \=== 'true';

  if (useVertexAI) {  
    // For Vertex AI, Project ID and Location are mandatory.  
    // Authentication is handled by Application Default Credentials (ADC).  
    const gcpProject \= process.env.GOOGLE\_CLOUD\_PROJECT;  
    const gcpLocation \= process.env.GOOGLE\_CLOUD\_LOCATION;

    if (\!gcpProject ||\!gcpLocation) {  
      throw new Error(  
        "For Vertex AI integration, GOOGLE\_CLOUD\_PROJECT and GOOGLE\_CLOUD\_LOCATION environment variables must be set."  
      );  
    }  
    return { useVertexAI, gcpProject, gcpLocation };  
  } else {  
    // For Gemini Developer API, an API key is mandatory.  
    const apiKey \= process.env.GOOGLE\_API\_KEY;  
    if (\!apiKey) {  
      throw new Error(  
        "For Gemini Developer API, GOOGLE\_API\_KEY environment variable must be set."  
      );  
    }  
    return { useVertexAI: false, apiKey };  
  }  
}

/\*\*  
 \* Initializes and returns an instance of the GoogleGenAI client.  
 \* This function encapsulates the logic for choosing the correct backend  
 \* and provides a single, reliable way to get a configured client instance.  
 \*  
 \* @returns {GoogleGenAI} An initialized GoogleGenAI client instance.  
 \*/  
function initializeGeminiClient(): GoogleGenAI {  
  const config \= getClientConfig();  
  let ai: GoogleGenAI;

  try {  
    if (config.useVertexAI) {  
      console.log(\`Initializing Gemini client for Vertex AI in project '${config.gcpProject}' and location '${config.gcpLocation}'.\`);  
      ai \= new GoogleGenAI({  
        vertexai: true,  
        project: config.gcpProject,  
        location: config.gcpLocation,  
      });  
    } else {  
      console.log("Initializing Gemini client for Gemini Developer API.");  
      ai \= new GoogleGenAI({  
        apiKey: config.apiKey,  
      });  
    }  
    return ai;  
  } catch (error) {  
    // Catch any unexpected errors during SDK initialization.  
    console.error("Failed to initialize GoogleGenAI client:", error);  
    throw new Error("Could not initialize the Gemini SDK. Please check your configuration and credentials.");  
  }  
}

// Export a singleton instance of the client to be used throughout the application.  
// This prevents re-initialization on every import and ensures a single point of configuration.  
export const geminiClient \= initializeGeminiClient();

## **3.0 Core Architecture and Capabilities**

The Gemini 2.5 series is defined by a confluence of three core architectural pillars: a sparse Mixture-of-Experts (MoE) design for computational efficiency, an exceptionally large context window for deep contextual understanding, and a natively multimodal foundation for unified data processing. These elements are not independent features but are deeply interconnected, enabling the models to achieve state-of-the-art performance on a wide range of complex tasks.

### **3.1 Sparse Mixture-of-Experts (MoE) Transformer Architecture**

The Gemini 2.5 models are built upon a sophisticated sparse Mixture-of-Experts (MoE) transformer architecture.7 This design represents a significant departure from traditional dense transformer models, which activate every single parameter for every input token processed. In a dense architecture, as the model size (and thus, its knowledge capacity) increases, the computational cost of inference scales proportionally, leading to higher latency and operational expenses.

The MoE architecture circumvents this trade-off by introducing a conditional computation mechanism. Instead of a single, monolithic set of parameters, an MoE model comprises a large number of smaller, specialized neural networks called "experts" and a "gating network" or router.1 When processing an input sequence, the gating network examines each token and dynamically learns to route it to a small subset of the most relevant experts.7 For example, a token related to Python code might be routed to experts specializing in programming languages, while a token describing a visual scene might be routed to experts trained on image-related concepts.

The key advantage of this design is the decoupling of total model capacity from the computational cost per token.7 The model can contain a vast number of parameters (experts), endowing it with extensive knowledge and reasoning capabilities comparable to a much larger dense model. However, for any single inference pass, only a fraction of these parameters are activated. This "sparsity" results in dramatically improved efficiency, leading to faster response times and lower serving costs without compromising the quality of the output on complex queries.1 This architecture is fundamental to how Gemini 2.5 models balance trillion-parameter-scale intelligence with practical, real-world performance requirements.1

### **3.2 The 1 Million Token Context Window**

A defining feature of the Gemini 2.5 series is its native support for a 1 million token context window for both Pro and Flash models.20 This capability represents a substantial leap from previous generations of large language models, which were often limited to context windows of a few thousand tokens.12 A 1 million token capacity allows the models to ingest and reason over massive, uninterrupted sequences of information in a single request. This is practically equivalent to processing the entirety of "Moby Dick" or "Don Quixote", analyzing a codebase with 50,000 lines, or understanding the content of an 8.4-hour audio file or a 3-hour video.12

This expansive "short-term memory" unlocks new paradigms for application development. It enables high-fidelity analysis of lengthy legal documents, comprehensive summarization of entire research corpora, and deep comprehension of large, complex codebases without the need to chunk data or implement complex state-management workarounds.12 The models were purpose-built with this capability, demonstrating powerful in-context learning where they can acquire new skills, such as translating a low-resource language, purely from reference materials provided within the prompt.12

While performance on retrieval-centric "needle-in-a-haystack" benchmarks is exceptionally strong, with high recall rates even at the 1 million token limit, it is important for architects to understand the performance characteristics for complex, multi-step generative tasks.13 Official technical reports and practical observations indicate that in long-running agentic workflows, performance can degrade as the context window becomes saturated (e.g., beyond 100,000 tokens).13 In such scenarios, the model may exhibit a tendency to repeat past actions rather than synthesizing novel plans from its extensive history. This suggests that while the attention mechanism can recall specific facts across vast distances, effectively synthesizing the entirety of a massive context to inform the next generative step remains a frontier of research. Therefore, for highly complex, long-running agents, a hybrid strategy that combines the long context window with higher-level state management techniques may be required to ensure robust performance.

### **3.3 Native Multimodality**

The Gemini 2.5 series is architected from the ground up to be natively multimodal, meaning it was trained from the beginning to process and generate content across a diverse range of data types in a single, unified step.14 This is a fundamental design choice that distinguishes it from models where multimodal capabilities are added post-hoc. The unified architecture allows for a seamless and deep understanding of interleaved text, code, images, audio, and video, enabling the model to reason across these modalities in a way that is not possible with separate, specialized models.8

This native capability allows developers to build applications that can understand the visual content of a PDF alongside its text, analyze the audio and video tracks of a movie simultaneously, or generate code to render a user interface based on a hand-drawn sketch.16 The model can perform tasks such as object detection, image captioning, video summarization, and audio transcription directly, without requiring pre-processing through separate APIs.26 The

gemini-2.5-flash-image-preview model further extends this by enabling conversational image editing, where a user can provide an image and then iteratively refine it using natural language prompts.15

To ensure predictable and reliable system design, it is critical for engineers to be aware of the specific input constraints for each modality. The following table details the maximum limits and supported formats for multimodal inputs.

| Modality | Maximum Items per Prompt | Maximum Size / Length | Supported MIME Types |
| :---- | :---- | :---- | :---- |
| **Image** | 3,000 | 7 MB per image | image/png, image/jpeg, image/webp |
| **Document** | 3,000 | 50 MB per file, 1,000 pages per file | application/pdf, text/plain |
| **Video** | 10 | \~1 hour (no audio), \~45 mins (with audio) | video/mp4, video/mpeg, video/quicktime, video/webm, video/wmv, video/x-flv, video/3gpp |
| **Audio** | 1 | \~8.4 hours (up to 1M tokens) | audio/wav, audio/mp3, audio/aac, audio/flac, audio/m4a, audio/mpeg, audio/opus, audio/pcm, audio/webm |

Data sourced from.20

### **3.4 The thinkingConfig Feature Set**

The thinkingConfig parameter is a powerful, developer-facing feature that provides direct control over the model's internal reasoning processes. This configuration object is a direct abstraction of the underlying MoE architecture's conditional computation, allowing developers to fine-tune the trade-off between response quality, latency, and cost on a per-request basis. It contains two primary sub-parameters: thinkingBudget and includeThoughts.

**thinkingBudget**

This parameter, specified in tokens, guides the model on the amount of additional computational effort it can expend at inference time to reason about a prompt before generating a final response.27 A higher

thinkingBudget allows the model's MoE routing mechanism to explore more diverse thinking strategies, potentially engaging more "experts" or performing more complex, multi-step reasoning paths. This generally leads to more accurate and relevant outputs for complex tasks such as advanced mathematics, strategic planning, or nuanced code generation.11 Conversely, a lower budget or disabling thinking entirely (where supported) reduces latency and cost, which may be preferable for simpler tasks.

A special value of \-1 enables "dynamic thinking," where the model autonomously assesses the complexity of the input prompt and calibrates the amount of thinking required, providing an adaptive balance between performance and efficiency.11 This feature moves performance tuning beyond simple sampling parameters and gives engineers a direct lever to control the reasoning depth of the model.

**includeThoughts**

Setting this boolean parameter to true instructs the model to return a "thought summary" alongside its final answer.27 This summary is a synthesized, human-readable version of the model's internal reasoning process, offering valuable insight into how it arrived at its conclusion.27 This transparency is particularly useful for debugging complex prompts, validating the model's logic in high-stakes applications (e.g., legal or financial analysis), and providing users with explanations for AI-generated recommendations. When used with streaming, this feature provides rolling, incremental updates to the thought summary as the model processes the request.27

The specific configuration options for thinkingBudget vary by model, as detailed in the table below.

| Model | Default Setting | Supported Range | Disable Value | Dynamic Value |
| :---- | :---- | :---- | :---- | :---- |
| **Gemini 2.5 Pro** | Dynamic Thinking | 128 to 32,768 | Not Supported | thinkingBudget \= \-1 |
| **Gemini 2.5 Flash** | Dynamic Thinking | 0 to 24,576 | thinkingBudget \= 0 | thinkingBudget \= \-1 |
| **Gemini 2.5 Flash-Lite** | No Thinking | 512 to 24,576 | thinkingBudget \= 0 | thinkingBudget \= \-1 |

Data sourced from.27

## **4.0 @google/genai SDK Reference**

This section provides a definitive and exhaustive reference for the public API surface of the @google/genai SDK for TypeScript. The SDK is structured around a central GoogleGenAI client instance, which provides access to several submodules that group related functionalities. The primary submodules are ai.models for core content generation, ai.chats for managing stateful conversations, and ai.files for handling media uploads. Each method is documented with its purpose, a complete list of parameters, its return object, and potential error states.

### **4.1 ai.models Module**

The ai.models module is the primary interface for stateless interactions with the Gemini models. It provides methods for generating content, counting tokens, and creating embeddings.

#### **4.1.1 generateContent**

This method sends a request to the model and returns the complete response in a single promise resolution. It is suitable for non-interactive tasks where the entire response is required before further processing can occur.

**Purpose:** To generate a model response for a given single-turn or multi-turn prompt.

**Parameters (GenerateContentParameters):**

| Parameter | Type | Required | Default | Description |
| :---- | :---- | :---- | :---- | :---- |
| model | string | Yes | N/A | The identifier of the model to use (e.g., 'gemini-2.5-pro'). |
| contents | Content | Yes | N/A | An array of Content objects representing the conversation history and the current prompt. |
| generationConfig | GenerationConfig | No | N/A | Optional configuration for model output, including temperature, topP, topK, maxOutputTokens, and stopSequences. |
| safetySettings | SafetySetting | No | N/A | A list of safety settings to override defaults for specific harm categories. |
| tools | Tool | No | N/A | A list of Tool objects (e.g., function declarations) the model can use. |
| toolConfig | ToolConfig | No | N/A | Configuration for tool usage, such as forcing a function call. |
| systemInstruction | Content | No | N/A | System-level instructions to guide the model's behavior. |
| cachedContent | string | No | N/A | The name of a cached content resource to use for context. |
| config.thinkingConfig | ThinkingConfig | No | N/A | Configuration for the model's thinking process, containing thinkingBudget and includeThoughts. |

**Returns:** Promise\<GenerateContentResponse\>

**Potential Error States:**

| HTTP Code | Canonical Name | Meaning | Recommended SDK-Level Action |
| :---- | :---- | :---- | :---- |
| 400 | INVALID\_ARGUMENT | The request payload is malformed (e.g., invalid types, missing required fields). | Validate the request object against the data models in Section 5.0 before sending. Ensure all parameters are correctly formatted. |
| 403 | PERMISSION\_DENIED | The API key is invalid or lacks the necessary permissions for the requested model. | Verify the GOOGLE\_API\_KEY or ADC setup. Ensure the principal has access to the specified model. |
| 404 | NOT\_FOUND | The specified model identifier does not exist. | Check the model identifier against the canonical list in Table 2.1. |
| 429 | RESOURCE\_EXHAUSTED | The request rate limit has been exceeded. | Implement an exponential backoff and retry mechanism for the API call. |
| 500 | INTERNAL | An unexpected internal error occurred on the server. | This is a server-side issue. Implement a retry mechanism. If the error persists, report it. |
| 503 | UNAVAILABLE | The service is temporarily overloaded or unavailable. | The service is at capacity. Implement an exponential backoff and retry mechanism. Consider switching to a different model temporarily if possible. |

Data sourced from.29

#### **4.1.2 generateContentStream**

This method initiates a request to the model and returns an AsyncGenerator that yields chunks of the response as they are generated. It is ideal for interactive applications, such as chatbots, where displaying partial results immediately improves the user experience.

**Purpose:** To generate a model response and stream it back to the client in real-time.

Parameters (GenerateContentParameters):  
The parameters are identical to the generateContent method.  
**Returns:** Promise\<AsyncGenerator\<GenerateContentResponse, any, unknown\>\>

Potential Error States:  
The potential error states are identical to the generateContent method. Errors may be thrown during the initial promise resolution or during the iteration of the async generator.

### **4.2 ai.chats Module**

The ai.chats module provides a higher-level abstraction for creating and managing stateful, multi-turn conversations. It automatically handles the conversation history, simplifying the development of interactive chat applications.

#### **4.2.1 create**

This method initializes a new Chat session object, optionally seeding it with an initial conversation history.

**Purpose:** To create a new, stateful chat session.

**Parameters (CreateChatParameters):**

| Parameter | Type | Required | Default | Description |
| :---- | :---- | :---- | :---- | :---- |
| model | string | Yes | N/A | The identifier of the model to use for the chat session. |
| history | Content | No | \`\` | An optional array of Content objects to initialize the chat history. |
| config | GenerationConfig | No | N/A | Default generation configuration to be used for all messages in the session. |

**Returns:** Chat

#### **4.2.2 Chat.sendMessage**

This method, called on a Chat instance returned by ai.chats.create, sends a new message to the model. It automatically appends the user's message and the model's subsequent response to the session's internal history.

**Purpose:** To send a message within a chat session and receive a complete response.

**Parameters (SendMessageParameters):**

| Parameter | Type | Required | Default | Description |
| :---- | :---- | :---- | :---- | :---- |
| message | string | Part | (string | Part) | Yes | N/A | The user's message, which can be a simple string or a more complex Part array for multimodal input. |
| config | GenerationConfig | No | N/A | Per-request generation configuration that overrides the session's default config. |

**Returns:** Promise\<GenerateContentResponse\>

### **4.3 ai.files Module**

The ai.files module provides an interface to the Files API, which is used for uploading and managing large media files that can be referenced in prompts. This is the recommended approach for files that exceed the inline request size limit or for files that will be reused across multiple API calls.6 Files are stored for 48 hours and are available at no cost.31

#### **4.3.1 upload**

**Purpose:** To upload a media file to the service.

**Parameters:**

| Parameter | Type | Required | Description |
| :---- | :---- | :---- | :---- |
| file | string | Yes | The local path to the file to be uploaded. |
| config | object | No | Optional configuration object, primarily for specifying the mimeType. |

**Returns:** Promise\<{ name: string; uri: string;... }\> (File metadata object)

#### **4.3.2 get**

**Purpose:** To retrieve the metadata for a previously uploaded file.

**Parameters:**

| Parameter | Type | Required | Description |
| :---- | :---- | :---- | :---- |
| name | string | Yes | The unique name of the file, obtained from the response of the upload method. |

**Returns:** Promise\<{ name: string; uri: string;... }\> (File metadata object)

#### **4.3.3 list**

**Purpose:** To retrieve a paginated list of all uploaded files for the project.

**Parameters:**

| Parameter | Type | Required | Description |
| :---- | :---- | :---- | :---- |
| config | object | No | Optional configuration object, e.g., { pageSize: 10 }. |

**Returns:** Promise\<AsyncGenerator\<FileMetadata\>\>

#### **4.3.4 delete**

**Purpose:** To delete a previously uploaded file.

**Parameters:**

| Parameter | Type | Required | Description |
| :---- | :---- | :---- | :---- |
| name | string | Yes | The unique name of the file to be deleted. |

**Returns:** Promise\<void\>

### **4.4 Thought Summaries**

The "Thought Summaries" feature provides developers with insight into the model's internal reasoning process. It is enabled by setting the includeThoughts flag to true within the thinkingConfig object of a request to generateContent or generateContentStream.27

When this feature is enabled, the response from the model may contain special Part objects that represent the model's thoughts. These parts are distinguished by a thought boolean property. The response parsing logic must iterate through the parts array of the returned Candidate and check for the existence of this property to differentiate between the reasoning summary and the final answer. This allows an application to display the model's reasoning process to the user, enhancing transparency and trust.27

## **5.0 Data Models**

This section provides a verbatim reproduction of the core data model interfaces used in the @google/genai SDK and the underlying REST API. These tables serve as the canonical reference for constructing valid request payloads and parsing response objects. A thorough understanding of these structures is essential for advanced use cases, including dynamic prompt construction, multimodal input, and tool use.

### **5.1 GenerateContentRequest Structure**

This interface represents the top-level JSON object sent to the generateContent endpoint.

| Field | Type | Description |
| :---- | :---- | :---- |
| contents | Content | **Required.** An array of Content objects representing the conversation history and the current prompt. For single-turn requests, this array contains a single object. |
| tools | Tool | *Optional.* A list of tools, such as function declarations, that the model can use to generate its response. |
| toolConfig | ToolConfig | *Optional.* Configuration that governs how the model uses the provided tools, such as forcing a specific function call. |
| safetySettings | SafetySetting | *Optional.* A list of safety settings to override the default thresholds for various harm categories. |
| systemInstruction | Content | *Optional.* A Content object containing system-level instructions that guide the model's overall behavior and persona. |
| generationConfig | GenerationConfig | *Optional.* An object containing parameters that control the generation process, such as temperature and token limits. |
| cachedContent | string | *Optional.* The resource name of a previously cached Content object to be used as context. |

Data sourced from.32

### **5.2 GenerateContentResponse Structure**

This interface represents the top-level JSON object received from the API. For streaming requests, a sequence of these objects is received.

| Field | Type | Description |
| :---- | :---- | :---- |
| candidates | Candidate | An array of Candidate objects, each representing a potential response from the model. |
| promptFeedback | PromptFeedback | *Optional.* Feedback regarding the safety of the content provided in the prompt. |
| usageMetadata | UsageMetadata | *Optional.* Metadata about the token usage for the request, including prompt, candidate, and total tokens. |

Data sourced from.33

### **5.3 Content Interface Structure**

The Content object is the fundamental building block of a conversation, representing a single turn from either the user or the model.

| Field | Type | Description |
| :---- | :---- | :---- |
| parts | Part | **Required.** An array of Part objects that make up this turn of the conversation. A single turn can be composed of multiple parts (e.g., text and an image). |
| role | "user" | "model" | **Required.** The role of the entity that produced this content. Must be "user" for prompts and "model" for responses. |

Data sourced from.21

### **5.4 Part Interface Structure**

The Part object represents a single, contiguous piece of data within a Content object. It is a union type, and only one of its data fields should be set.

| Field | Type | Description |
| :---- | :---- | :---- |
| text | string | A text string. |
| inlineData | { mimeType: string; data: string; } | Inline media data, where data is a base64-encoded string. |
| fileData | { mimeType: string; fileUri: string; } | A reference to a file uploaded via the Files API or a Google Cloud Storage URI. |
| functionCall | FunctionCall | A function call requested by the model. |
| functionResponse | FunctionResponse | The result of a function call, provided back to the model. |
| thought | boolean | A flag indicating that this part contains a thought summary from the model. |

Data sourced from.21

### **5.5 Candidate Interface Structure**

A Candidate object represents one of the possible responses generated by the model for a given prompt.

| Field | Type | Description |
| :---- | :---- | :---- |
| content | Content | The content of the response generated by the model. |
| finishReason | string | The reason the model stopped generating tokens (e.g., STOP, MAX\_TOKENS, SAFETY). |
| safetyRatings | SafetyRating | A list of safety ratings for the generated content, one for each harm category. |
| citationMetadata | CitationMetadata | *Optional.* Citation sources for any content that was recited from the training data. |
| tokenCount | number | The total number of tokens in this candidate's content. |
| index | number | The index of this candidate in the list of candidates. |

Data sourced from.34

## **6.0 End-to-End Workflows (React/TypeScript)**

This section provides two complete, production-grade workflows demonstrating how to implement key features of the Gemini 2.5 series and the @google/genai SDK in a TypeScript environment. These examples are designed to be integrated into a React frontend or a Node.js backend and include extensive line-by-line commentary to explain the architectural decisions and API usage patterns.

### **6.1 Implementing and Parsing 'Thought Summaries'**

This workflow demonstrates how to enable and process the "Thought Summaries" feature. The core logic involves configuring the API request to include thoughts and then parsing the response to differentiate between the model's reasoning and its final answer. This pattern is essential for applications that require transparency into the AI's decision-making process.

The following TypeScript function encapsulates the logic for making a request with includeThoughts enabled. It constructs the request object, calls the generateContent method, and then carefully processes the response. The parsing logic iterates through the parts array of the first candidate. It uses the part.thought boolean property—a key element of the API contract for this feature—to segregate the content. This allows the function to return a structured object containing both the reasoning and the final answer, which can then be rendered separately in a user interface.

TypeScript

// Filename: getResponseWithThoughts.ts  
// Description: A service function to call the Gemini API, enabling and parsing thought summaries.

import { geminiClient } from './geminiClient'; // Assumes client is initialized as shown in Section 2.1  
import { GenerateContentResponse, Part } from "@google/genai";

// Define a structured return type for clarity and type safety.  
// This separates the model's reasoning from its final answer.  
export interface ThoughtfulResponse {  
  thoughtSummary: string | null;  
  answer: string;  
}

/\*\*  
 \* Calls the Gemini 2.5 Pro model with a given prompt, requesting a thought summary.  
 \* It parses the response to separate the model's reasoning from the final answer.  
 \*  
 \* @param {string} prompt The user's prompt to send to the model.  
 \* @returns {Promise\<ThoughtfulResponse\>} A promise that resolves to an object  
 \*          containing the thought summary and the final answer.  
 \* @throws {Error} If the API call fails or the response is malformed.  
 \*/  
export async function getResponseWithThoughts(prompt: string): Promise\<ThoughtfulResponse\> {  
  try {  
    // 1\. Make the API call using the generateContent method.  
    // The key step is to include the \`thinkingConfig\` object in the request's \`config\`.  
    // We set \`includeThoughts\` to \`true\` to explicitly request the reasoning summary.  
    // This aligns with the ground truth implementation for this feature.  
    const result: GenerateContentResponse \= await geminiClient.models.generateContent({  
      model: 'gemini-2.5-pro', // A model that supports thinking is required.  
      contents: \[{ role: 'user', parts: \[{ text: prompt }\] }\],  
      config: {  
        thinkingConfig: {  
          includeThoughts: true,  
        },  
      },  
    });

    // 2\. Initialize variables to hold the parsed content.  
    let thoughtSummary: string | null \= null;  
    let answerParts: string \=;

    // 3\. The response contains a list of candidates. For a standard request, we process the first one.  
    const candidate \= result.candidates?.;  
    if (\!candidate ||\!candidate.content ||\!candidate.content.parts) {  
      throw new Error("Invalid response structure received from Gemini API.");  
    }

    // 4\. Iterate through each 'Part' of the response content.  
    // This is the critical parsing step. The API returns both thoughts and answers  
    // as separate 'Part' objects within the same content array.  
    for (const part of candidate.content.parts) {  
      // 5\. Check the 'thought' boolean property on the Part object.  
      // If \`part.thought\` is true, the text of this part is a thought summary.  
      // If it's false or undefined, it's part of the final answer.  
      if (part.thought && part.text) {  
        thoughtSummary \= part.text;  
      } else if (part.text) {  
        // Collect all non-thought text parts.  
        answerParts.push(part.text);  
      }  
    }

    // 6\. Join the answer parts and return the structured response.  
    // This provides a clean separation for the calling component to render.  
    return {  
      thoughtSummary,  
      answer: answerParts.join('\\n').trim(),  
    };

  } catch (error) {  
    console.error("Error fetching response with thoughts:", error);  
    // Re-throw the error to be handled by the calling UI component (e.g., to display an error message).  
    throw new Error("Failed to get a thoughtful response from the Gemini API.");  
  }  
}

### **6.2 Performing a Complex Multi-modal Image Analysis**

This workflow demonstrates how to construct and send a multimodal prompt that combines image data and text for a visual reasoning task. This pattern is fundamental for applications that need to analyze user-provided images, such as product identification, document analysis, or visual Q\&A.

The process begins with a utility function, imageToGenerativePart, which takes a local file path and its MIME type, reads the file into a buffer, converts it to a base64 string, and wraps it in the Part object structure required by the API. The main function, analyzeImageWithText, then uses this utility to prepare the image data. It constructs the contents array by interleaving the image Part with a text Part. This sequencing is crucial; the order of parts in the array provides context to the model. Here, the text prompt follows the image, effectively asking a question *about* the preceding image. This demonstrates the concept of multimodal prompting as a sequence-authoring task, which is a more powerful paradigm than simple file attachment.

TypeScript

// Filename: analyzeImageService.ts  
// Description: A service for performing multimodal analysis by combining an image and a text prompt.

import \* as fs from 'fs/promises';  
import { geminiClient } from './geminiClient'; // Assumes client is initialized as shown in Section 2.1  
import { Part, GenerateContentResponse } from "@google/genai";

/\*\*  
 \* Reads an image file from a local path, converts it to a base64 string,  
 \* and formats it as a 'Part' object for the Gemini API.  
 \*  
 \* @param {string} path The local file path to the image.  
 \* @param {string} mimeType The MIME type of the image (e.g., 'image/jpeg').  
 \* @returns {Promise\<Part\>} A promise that resolves to a 'Part' object containing the inline image data.  
 \*/  
async function imageToGenerativePart(path: string, mimeType: string): Promise\<Part\> {  
  // 1\. Read the image file from the specified path into a buffer.  
  const imageBuffer \= await fs.readFile(path);

  // 2\. Convert the raw image buffer to a base64 encoded string.  
  // The Gemini API requires inline image data to be in this format.  
  const base64EncodedImage \= imageBuffer.toString('base64');

  // 3\. Return the data structured as an 'inlineData' Part object.  
  // This structure is defined in the data models (Section 5.0) and is the  
  // required format for embedding media directly into the request payload.  
  return {  
    inlineData: {  
      data: base64EncodedImage,  
      mimeType,  
    },  
  };  
}

/\*\*  
 \* Sends an image and a text prompt to a Gemini vision model for analysis.  
 \*  
 \* @param {string} imagePath The local path to the image file.  
 \* @param {string} imageMimeType The MIME type of the image.  
 \* @param {string} textPrompt The text prompt to accompany the image.  
 \* @returns {Promise\<string\>} A promise that resolves to the model's text response.  
 \* @throws {Error} If the API call fails.  
 \*/  
export async function analyzeImageWithText(  
  imagePath: string,  
  imageMimeType: string,  
  textPrompt: string  
): Promise\<string\> {  
  try {  
    // 4\. Use the utility function to prepare the image Part.  
    const imagePart \= await imageToGenerativePart(imagePath, imageMimeType);

    // 5\. Construct the request payload. The 'contents' array is an ordered  
    // sequence of Parts. The order matters. Here, we place the text prompt  
    // first, followed by the image, to instruct the model on how to analyze the image.  
    // This demonstrates the principle that multimodal prompting is a sequence-authoring task.  
    const contents \= \[  
      {  
        role: 'user',  
        parts: \[  
          { text: textPrompt },  
          imagePart  
        \],  
      },  
    \];

    // 6\. Call the API with a vision-capable model.  
    const result: GenerateContentResponse \= await geminiClient.models.generateContent({  
      model: 'gemini-2.5-flash', // Use a model that supports vision input.  
      contents: contents,  
    });

    // 7\. Extract and return the text from the response.  
    const responseText \= result.candidates?.?.content?.parts?.?.text;  
    if (typeof responseText\!== 'string') {  
      throw new Error("No text response received from the Gemini API.");  
    }

    return responseText;

  } catch (error) {  
    console.error("Error during multimodal analysis:", error);  
    throw new Error("Failed to analyze the image with the Gemini API.");  
  }  
}

## **7.0 Conclusion and Strategic Outlook**

The Gemini 2.5 series, in conjunction with the unified @google/genai SDK, represents a significant and strategic evolution in the landscape of generative AI. The analysis presented in this document demonstrates a platform that has matured beyond incremental improvements in language modeling into an integrated system engineered for a new class of complex, context-aware, and multimodal applications. The primary technical advantages—the computational efficiency of the sparse Mixture-of-Experts architecture, the vast contextual memory of the 1 million token window, and the seamless processing of diverse data types through native multimodality—are not isolated features. They are a convergent set of capabilities designed to empower developers to build sophisticated, autonomous AI agents.

The MoE architecture, made directly accessible to developers through the thinkingConfig parameter, introduces a novel paradigm for performance tuning. As detailed in Section 3.0, the ability to specify a thinkingBudget provides a direct lever to control the trade-off between reasoning depth, latency, and cost. This moves system design beyond simple sampling adjustments and allows for the dynamic allocation of computational resources on a per-task basis, a critical requirement for building economically viable and performant agentic systems that must handle tasks of varying complexity.

Furthermore, the 1 million token context window, while a powerful tool for ingesting and recalling information from vast datasets, also presents new architectural considerations. As the analysis of its performance characteristics revealed, there is a crucial distinction between its efficacy in high-fidelity retrieval tasks and its behavior in long-running, generative workflows. This nuance underscores that while the need for some external knowledge retrieval systems like RAG may be diminished, the principles of robust state management remain critical for architecting reliable, large-scale agents that can reason effectively over their extensive operational history without performance degradation.

Ultimately, the Gemini 2.5 platform should be viewed as a foundational toolkit for the next generation of software development. The combination of a massive context window (long-term memory), native multimodality (sensory input), and controllable thinking (scalable reasoning) provides the essential components for building systems that can perceive complex, multi-format environments, maintain context over extended interactions, and intelligently allocate resources to solve problems. The @google/genai SDK, with its client-centric design and clear separation of stateless and stateful interaction patterns, provides the robust and scalable interface required to harness these capabilities. For senior engineers and architects, the directive is clear: the era of simple prompt-response chatbots is giving way to one of sophisticated AI agents, and the Gemini 2.5 platform provides the core infrastructure to build them.

#### **Works cited**

1. Gemini 2.5 Pro: A New Era of AI-Powered Productivity | by Rapid Innovation \- Medium, accessed September 15, 2025, [https://medium.com/@rapidinnovation/gemini-2-5-pro-a-new-era-of-ai-powered-productivity-e8ffde83f528](https://medium.com/@rapidinnovation/gemini-2-5-pro-a-new-era-of-ai-powered-productivity-e8ffde83f528)  
2. Gemini \- Google DeepMind, accessed September 15, 2025, [https://deepmind.google/models/gemini/](https://deepmind.google/models/gemini/)  
3. Migrate to the Google GenAI SDK | Gemini API | Google AI for Developers, accessed September 15, 2025, [https://ai.google.dev/gemini-api/docs/migrate](https://ai.google.dev/gemini-api/docs/migrate)  
4. Gemini API libraries | Google AI for Developers, accessed September 15, 2025, [https://ai.google.dev/gemini-api/docs/libraries](https://ai.google.dev/gemini-api/docs/libraries)  
5. google-gemini/deprecated-generative-ai-python: This SDK is now deprecated, use the new unified Google GenAI SDK. \- GitHub, accessed September 15, 2025, [https://github.com/google-gemini/deprecated-generative-ai-python](https://github.com/google-gemini/deprecated-generative-ai-python)  
6. How to Use the Google Gen AI TypeScript/JavaScript SDK to Build Powerful Generative AI Applications \- Apidog, accessed September 15, 2025, [https://apidog.com/blog/how-to-use-the-google-gen-ai/](https://apidog.com/blog/how-to-use-the-google-gen-ai/)  
7. \[2.5 Deep Think\] Model Card PDF (Aug 1, 2025\) \- Googleapis.com, accessed September 15, 2025, [https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-2-5-Deep-Think-Model-Card.pdf](https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-2-5-Deep-Think-Model-Card.pdf)  
8. Gemini 2.5 Flash & 2.5 Flash Image \- Model Card \- Googleapis.com, accessed September 15, 2025, [https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-2-5-Flash-Model-Card.pdf](https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-2-5-Flash-Model-Card.pdf)  
9. Papers Explained 393: Gemini 2.5 \- Ritvik Rastogi \- Medium, accessed September 15, 2025, [https://ritvik19.medium.com/papers-explained-393-gemini-2-5-3b8877cf4da9](https://ritvik19.medium.com/papers-explained-393-gemini-2-5-3b8877cf4da9)  
10. AI on AI: from MoE to Small Specialized Models \- Champaign Magazine, accessed September 15, 2025, [https://champaignmagazine.com/2025/08/05/ai-on-ai-from-moe-to-small-specialized-models/](https://champaignmagazine.com/2025/08/05/ai-on-ai-from-moe-to-small-specialized-models/)  
11. Gemini 2.5 Pro \- Google DeepMind, accessed September 15, 2025, [https://deepmind.google/models/gemini/pro/](https://deepmind.google/models/gemini/pro/)  
12. Long context | Gemini API | Google AI for Developers, accessed September 15, 2025, [https://ai.google.dev/gemini-api/docs/long-context](https://ai.google.dev/gemini-api/docs/long-context)  
13. Gemini 2.5: Pushing the Frontier with Advanced ... \- Googleapis.com, accessed September 15, 2025, [https://storage.googleapis.com/deepmind-media/gemini/gemini\_v2\_5\_report.pdf](https://storage.googleapis.com/deepmind-media/gemini/gemini_v2_5_report.pdf)  
14. Advanced audio dialog and generation with Gemini 2.5 \- Google Blog, accessed September 15, 2025, [https://blog.google/technology/google-deepmind/gemini-2-5-native-audio/](https://blog.google/technology/google-deepmind/gemini-2-5-native-audio/)  
15. How to prompt Gemini 2.5 Flash Image Generation for the best results, accessed September 15, 2025, [https://developers.googleblog.com/en/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/](https://developers.googleblog.com/en/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/)  
16. 7 examples of Gemini's multimodal capabilities in action \- Google ..., accessed September 15, 2025, [https://developers.googleblog.com/en/7-examples-of-geminis-multimodal-capabilities-in-action/](https://developers.googleblog.com/en/7-examples-of-geminis-multimodal-capabilities-in-action/)  
17. Image generation with Gemini (aka Nano Banana) | Gemini API | Google AI for Developers, accessed September 15, 2025, [https://ai.google.dev/gemini-api/docs/image-generation](https://ai.google.dev/gemini-api/docs/image-generation)  
18. Google models | Generative AI on Vertex AI, accessed September 15, 2025, [https://cloud.google.com/vertex-ai/generative-ai/docs/models](https://cloud.google.com/vertex-ai/generative-ai/docs/models)  
19. Gemini models | Gemini API | Google AI for Developers, accessed September 15, 2025, [https://ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models)  
20. Gemini 2.5 Pro | Generative AI on Vertex AI \- Google Cloud, accessed September 15, 2025, [https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-pro](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-pro)  
21. @google/genai \- npm, accessed September 15, 2025, [https://www.npmjs.com/package/@google/genai](https://www.npmjs.com/package/@google/genai)  
22. googleapis/js-genai: TypeScript/JavaScript SDK for Gemini and Vertex AI. \- GitHub, accessed September 15, 2025, [https://github.com/googleapis/js-genai](https://github.com/googleapis/js-genai)  
23. Gemini 2.5 Flash | Generative AI on Vertex AI \- Google Cloud, accessed September 15, 2025, [https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash)  
24. LLMs with largest context windows \- Codingscape, accessed September 15, 2025, [https://codingscape.com/blog/llms-with-largest-context-windows](https://codingscape.com/blog/llms-with-largest-context-windows)  
25. The Gemini 2.5 models are sparse mixture-of-experts (MoE) : r/LocalLLaMA \- Reddit, accessed September 15, 2025, [https://www.reddit.com/r/LocalLLaMA/comments/1ldxuk1/the\_gemini\_25\_models\_are\_sparse\_mixtureofexperts/](https://www.reddit.com/r/LocalLLaMA/comments/1ldxuk1/the_gemini_25_models_are_sparse_mixtureofexperts/)  
26. Image understanding | Gemini API | Google AI for Developers, accessed September 15, 2025, [https://ai.google.dev/gemini-api/docs/image-understanding](https://ai.google.dev/gemini-api/docs/image-understanding)  
27. Gemini thinking | Gemini API | Google AI for Developers, accessed September 15, 2025, [https://ai.google.dev/gemini-api/docs/thinking](https://ai.google.dev/gemini-api/docs/thinking)  
28. Google Generative AI provider \- AI SDK, accessed September 15, 2025, [https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai)  
29. Troubleshooting guide | Gemini API | Google AI for Developers, accessed September 15, 2025, [https://ai.google.dev/gemini-api/docs/troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting)  
30. Generative AI on Vertex AI inference API errors | Google Cloud, accessed September 15, 2025, [https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/api-errors](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/api-errors)  
31. Files API | Gemini API | Google AI for Developers, accessed September 15, 2025, [https://ai.google.dev/gemini-api/docs/files](https://ai.google.dev/gemini-api/docs/files)  
32. Generating content | Gemini API | Google AI for Developers, accessed September 15, 2025, [https://ai.google.dev/api/generate-content](https://ai.google.dev/api/generate-content)  
33. Gemini API reference | Google AI for Developers, accessed September 15, 2025, [https://ai.google.dev/api](https://ai.google.dev/api)  
34. GenerateContentResponse | Generative AI on Vertex AI | Google ..., accessed September 15, 2025, [https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/GenerateContentResponse](https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/GenerateContentResponse)  
35. GenerateContentResponse | Vertex AI \- Google Cloud, accessed September 15, 2025, [https://cloud.google.com/vertex-ai/docs/reference/rest/v1/GenerateContentResponse](https://cloud.google.com/vertex-ai/docs/reference/rest/v1/GenerateContentResponse)  
36. Google Gen AI SDK documentation, accessed September 15, 2025, [https://googleapis.github.io/python-genai/](https://googleapis.github.io/python-genai/)