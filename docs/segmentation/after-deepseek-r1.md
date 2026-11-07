# Segmentation dump: DeepSeek-R1-latest.pdf

- pages: 8 / 86
- paragraphs (canonical): 99
- page-break joins: 4
- translatable: 50
- body font size: 10.9
- extract time: 75 ms
- font tiers: body=10.9 h1=16 h2=15 h3=13

Legend: `T` = translated, `·` = skipped. Roles: title/author/heading/abstract/body/
figure-caption/table-caption/keywords are translated; table/formula/toc/
figure-data/pageNoise/footnote/meta are not.

## Page 1

[  1] T `title         ` p1 · 16pt · 2 lines
      DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning

[  2] · `author        ` p1 · 11pt · 2 lines
      DeepSeek-AI research@deepseek.com

[  3] T `heading       ` p1 · 15pt · 1 lines
      Abstract

[  4] T `abstract      ` p1 · 11pt · 14 lines
      General reasoning represents a long-standing and formidable challenge in artificial intelligence. Recent breakthroughs, exemplified by large language models (LLMs) (Brown et al., 2020; OpenAI, 2023) and chain-of-thought prompting (Wei et al., 2022b), have achieved considerable success on foundational reasoning tasks. However, this success is heavily contingent upon extensive human-annotated demonstrations, and models’ capabilities are still insufficient for more complex problems. Here we show that the reasoning abilities of LLMs can be incentivized through pure reinforcement learning (RL), obviating the need for human-labeled reasoning trajectories. The proposed RL framework facilitates the emergent development of advanced reasoning patterns, such as self-reflection, verification, and dynamic strategy adaptation. Consequently, the trained model achieves superior performance on verifiable tasks such as mathematics, coding competitions, and STEM fields, surpassing its counterparts trained via conventional supervised learning on human demonstrations. Moreover, the emergent reasoning patterns exhibited by these large-scale models can be systematically harnessed to guide and enhance the reasoning capabilities of smaller models.

[  5] T `heading       ` p1 · 13pt · 1 lines
      1. Introduction

[  6] T `body          ` p1 · 10.9pt · 16 lines · continues on the next page
      Reasoning capability, the cornerstone of human intelligence, enables complex cognitive tasks ranging from mathematical problem-solving to logical deduction and programming. Recent advances in artificial intelligence have demonstrated that large language models (LLMs) can exhibit emergent behaviors, including reasoning abilities, when scaled to a sufficient size (Kaplan et al., 2020; Wei et al., 2022a). However, achieving such capabilities in pre-training typically demands substantial computational resources. In parallel, a complementary line of research has demonstrated that large language models can be effectively augmented through chain-ofthought (CoT) prompting. This technique, which involves either providing carefully designed few-shot examples or using minimalistic prompts such as “Let’s think step by step”(Kojima et al., 2022; Wei et al., 2022b), enables models to produce intermediate reasoning steps, thereby substantially enhancing their performance on complex tasks. Similarly, further performance gains have been observed when models learn high-quality, multi-step reasoning trajectories during the post-training phase (Chung et al., 2024; OpenAI, 2023). Despite their effectiveness, these approaches exhibit notable limitations. Their dependence on human-annotated reasoning traces hinders scalability and introduces cognitive biases. Furthermore, by constraining models to replicate human thought processes, their performance is inherently capped by the humanprovided exemplars, which prevents the exploration of superior, non-human-like reasoning pathways.

## Page 2

[  7] T `body          ` p2 · 10.9pt · 2 lines · (continuation of a paragraph from the previous page)
      provided exemplars, which prevents the exploration of superior, non-human-like reasoning pathways.

[  8] T `body          ` p2 · 10.9pt · 15 lines
      To tackle these issues, we aim to explore the potential of LLMs for developing reasoning abilities through self-evolution in an RL framework, with minimal reliance on human labeling efforts. Specifically, we build upon DeepSeek-V3-Base (DeepSeek-AI, 2024b) and employ Group Relative Policy Optimization (GRPO) (Shao et al., 2024) as our RL framework. The reward signal is solely based on the correctness of final predictions against ground-truth answers, without imposing constraints on the reasoning process itself. Notably, we bypass the conventional supervised fine-tuning (SFT) phase before RL training. This design choice stems from our hypothesis that human-defined reasoning patterns may limit model exploration, whereas unrestricted RL training can better incentivize the emergence of novel reasoning capabilities in LLMs. Through this process, detailed in Section 2, our model (referred to as DeepSeek-R1-Zero) naturally developed diverse and sophisticated reasoning behaviors. In solving reasoning problems, the model exhibits a tendency to generate longer responses, incorporating verification, reflection, and the exploration of alternative approaches within each response. Although we do not explicitly teach the model how to reason, it successfully learns improved reasoning strategies through reinforcement learning.

[  9] T `body          ` p2 · 10.9pt · 10 lines
      Although DeepSeek-R1-Zero demonstrates excellent reasoning capabilities, it faces challenges such as poor readability and language mixing, occasionally combining English and Chinese within a single chain-of-thought response. Furthermore, the rule-based RL training stage of DeepSeek-R1-Zero is narrowly focused on reasoning tasks, resulting in limited performance in broader areas such as writing and open-domain question answering. To address these challenges, we introduce DeepSeek-R1, a model trained through a multi-stage learning framework that integrates rejection sampling, reinforcement learning, and supervised finetuning, detailed in Section 3. This training pipeline enables DeepSeek-R1 to inherit the reasoning capabilities of its predecessor, DeepSeek-R1-Zero, while aligning model behavior with human preferences through additional non-reasoning data.

[ 10] T `body          ` p2 · 10.9pt · 8 lines
      To enable broader access to powerful AI at a lower energy cost, we have distilled several smaller models and made them publicly available. These distilled models exhibit strong reasoning capabilities, surpassing the performance of their original instruction-tuned counterparts. We believe that these instruction-tuned versions will also significantly contribute to the research community by providing a valuable resource for understanding the mechanisms underlying long chain-of-thought (CoT) reasoning models and for fostering the development of more powerful reasoning models. We release DeepSeek-R1 series models to the public at https://huggingface.co/deepseek-ai.

[ 11] T `heading       ` p2 · 13pt · 1 lines
      2. DeepSeek-R1-Zero

[ 12] T `body          ` p2 · 10.9pt · 3 lines
      We begin by elaborating on the training of DeepSeek-R1-Zero, which relies exclusively on reinforcement learning without supervised fine-tuning. To facilitate large-scale RL efficiency, we adopt Group Relative Policy Optimization (GRPO) (Shao et al., 2024).

[ 13] T `body          ` p2 · 10.9pt · 5 lines
      2.1. Group Relative Policy Optimization GRPO (Shao et al., 2024) is the reinforcement learning algorithm that we adopt to train DeepSeek-R1-Zero and DeepSeek-R1. It was originally proposed to simplify the training process and reduce the resource consumption of Proximal Policy Optimization (PPO) (Schulman et al., 2017), which is widely used in the RL stage of LLMs (Ouyang et al., 2022).

## Page 3 (two columns)

[ 14] T `body          ` p3 · 10.9pt · 2 lines
      For each question 𝑞, GRPO samples a group of outputs {𝑜1, 𝑜2, · · · , 𝑜𝐺 } from the old policy 𝜋𝜃𝑜𝑙𝑑 and then optimizes the policy model 𝜋𝜃 by maximizing the following objective:

[ 15] · `figure-data   ` p3 · 10.9pt · 1 lines
      min

[ 16] T `body          ` p3 · 10.9pt · 3 lines
      − log where 𝜋𝑟𝑒 𝑓 is a reference policy, 𝜀 and 𝛽 are hyper-parameters, and 𝐴𝑖 is the advantage, computed using a group of rewards {𝑟1, 𝑟2, . . . , 𝑟𝐺 } corresponding to the outputs within each group:

[ 17] T `body          ` p3 · 10.9pt · 9 lines
      We give a comparison of GRPO and PPO in Supplementary A.3. To train DeepSeek-R1-Zero, we set the learning rate to 3e-6, the KL coefficient to 0.001, and the sampling temperature to 1 for rollout. For each question, we sample 16 outputs with a maximum length of 32,768 tokens before the 8.2k step and 65,536 tokens afterward. As a result, both the performance and response length of DeepSeek-R1-Zero exhibit a significant jump at the 8.2k step, with training continuing for a total of 10,400 steps, corresponding to 1.6 training epochs. Each training step consists of 32 unique questions, resulting in a training batch size of 512. Every 400 steps, we replace the reference model with the latest policy model. To accelerate training, each rollout generates 8,192 outputs, which are randomly split into 16 mini-batches and trained for only a single inner epoch.

[ 18] T `table-caption ` p3 · 10.9pt · 2 lines
      Table 1 | Template for DeepSeek-R1-Zero. prompt will be replaced with the specific reasoning question during training.

[ 19] T `body          ` p3 · 10pt · 5 lines
      A conversation between User and Assistant. The user asks a question, and the Assistant solves it. The assistant first thinks about the reasoning process in the mind and then provides the user with the answer. The reasoning process and answer are enclosed within <think>...</think> and <answer>...</answer> tags, respectively, i.e., <think> reasoning process here </think> <answer> answer here </answer>. User: prompt. Assistant:

[ 20] T `body          ` p3 · 10.9pt · 2 lines
      Our high-performance RL infrastructure is described in Supplementary B.1, ensuring scalable and efficient training.

[ 21] T `body          ` p3 · 10.9pt · 5 lines
      2.2. Reward Design The reward is the source of the training signal, which decides the direction of RL optimization. For DeepSeek-R1-Zero, we employ rule-based rewards to deliver precise feedback for data in mathematical, coding, and logical reasoning domains. Our rule-based reward system mainly consists of two types of rewards: accuracy rewards and format rewards.

[ 22] T `body          ` p3 · 10.9pt · 4 lines · continues on the next page
      Accuracy rewards evaluate whether the response is correct. For example, in the case of math problems with deterministic results, the model is required to provide the final answer in a specified format (e.g., within a box), enabling reliable rule-based verification of correctness. Similarly, for code competition prompts, a compiler can be utilized to evaluate the model’s responses against a suite of predefined test cases, thereby generating objective feedback on correctness.

## Page 4 (two columns)

[ 23] · `figure-data   ` p4 · 4.9pt · 1 lines
      DeepSeek-R1-Zero AIME accuracy during training

[ 24] · `figure-data   ` p4 · 4.9pt · 2 lines
      r1-zero-pass@1 r1-zero-cons@16

[ 25] · `figure-data   ` p4 · 4.9pt · 1 lines
      human participants

[ 26] · `figure-data   ` p4 · 4.9pt · 1 lines
      DeepSeek-R1-Zero average length per response during training

[ 27] · `figure-data   ` p4 · 4.9pt · 1 lines
      Steps

[ 28] T `figure-caption` p4 · 10.9pt · 7 lines
      Figure 1 | (a) AIME accuracy of DeepSeek-R1-Zero during training. AIME takes a mathematical problem as input and a number as output, illustrated in Table 32. Pass@1 and Cons@16 are described in Supplementary D.1. The baseline is the average score achieved by human participants in the AIME competition. (b) The average response length of DeepSeek-R1-Zero on the training set during the RL process. DeepSeek-R1-Zero naturally learns to solve reasoning tasks with more thinking time. Note that a training step refers to a single policy update operation.

[ 29] · `figure-data   ` p4 · 4.9pt · 1 lines
      Steps

[ 30] T `body          ` p4 · 10.9pt · 2 lines · (continuation of a paragraph from the previous page)
      responses against a suite of predefined test cases, thereby generating objective feedback on correctness.

[ 31] T `body          ` p4 · 10.9pt · 4 lines
      Format rewards complement the accuracy reward model by enforcing specific formatting requirements. In particular, the model is incentivized to encapsulate its reasoning process within designated tags, specifically ‘<think> ’ and ‘</think> ’. This ensures that the model’s thought process is explicitly delineated, enhancing interpretability and facilitating subsequent analysis.

[ 32] T `body          ` p4 · 10.9pt · 6 lines
      The accuracy, reward and format reward are combined with the same weight. Notably, we abstain from applying neural reward models—whether outcome-based or process-based—to reasoning tasks. This decision is predicated on our observation that neural reward models are susceptible to reward hacking during large-scale reinforcement learning. Moreover, retraining such models necessitates substantial computational resources and introduces additional complexity into the training pipeline, thereby complicating the overall optimization process.

[ 33] T `body          ` p4 · 10.9pt · 6 lines
      2.3. Incentivize Reasoning Capability in LLMs Specifically, we apply the RL technique on the DeepSeek-V3 base to train DeepSeek-R1-Zero. During training, we design a straightforward template, to require DeepSeek-R1-Zero to first produce a reasoning process, followed by the final answer. We intentionally limit our constraints to this structural format, avoiding any content-specific biases to ensure that we can accurately observe the model’s natural progression during the RL process.

[ 34] T `body          ` p4 · 10.9pt · 4 lines · continues on the next page
      Figure 1(a) depicts the performance trajectory of DeepSeek-R1-Zero on the AIME 2024 benchmark throughout the RL training process, where the average pass@1 score on AIME 2024 shows a significant increase, jumping from an initial 15.6% to 77.9%. In addition, by leveraging the self-consistency decoding (Wang et al., 2023c), the model’s performance can be Question: If 𝑎 > 1, then the sum of the real solutions of 𝑎 − 𝑎 + 𝑥 = 𝑥 is equal to Response: <think> To solve the equation 𝑎 − 𝑎 + 𝑥 = 𝑥, let’s start by squaring both · · · √︁ Rearrange to isolate the inner square root term:

## Page 5

[ 35] T `table-caption ` p5 · 10.9pt · 3 lines
      Table 2 | An interesting “aha moment” of an intermediate version of DeepSeek-R1-Zero. The model learns to rethink using an anthropomorphic tone. This is also an aha moment for us, allowing us to witness the power and beauty of reinforcement learning.

[ 36] T `body          ` p5 · 10.9pt · 5 lines · (continuation of a paragraph from the previous page)
      Question: If 𝑎 > 1, then the sum of the real solutions of 𝑎 − 𝑎 + 𝑥 = 𝑥 is equal to Response: <think> To solve the equation 𝑎 − 𝑎 + 𝑥 = 𝑥, let’s start by squaring both · · · √︁ Rearrange to isolate the inner square root term:

[ 37] T `body          ` p5 · 10.9pt · 1 lines
      Wait, wait. Wait. That’s an aha moment I can flag here.

[ 38] T `body          ` p5 · 10.9pt · 4 lines
      Let’s reevaluate this step-by-step to identify if the correct sum can be · · · We started with the equation: √︁ First, let’s square both sides:

[ 39] T `body          ` p5 · 10.9pt · 2 lines
      Next, I could square both sides again, treating the equation: · · ·. . .

[ 40] T `body          ` p5 · 10.9pt · 5 lines
      further improved, achieving an accuracy of 86.7%. This performance significantly surpasses the average performance across all human competitors. Besides the math competitions, as shown in Figure 10, DeepSeek-R1-Zero also achieves remarkable performance in coding competitions and graduate-level biology, physics, and chemistry problems. These results underscore the effectiveness of RL in enhancing the reasoning capabilities of large language models.

[ 41] T `body          ` p5 · 10.9pt · 2 lines
      The self-evolution of DeepSeek-R1-Zero exemplifies how RL can autonomously enhance a model’s reasoning capabilities.

[ 42] T `body          ` p5 · 10.9pt · 4 lines
      As shown in Figure 1(b), DeepSeek-R1-Zero exhibits a steady increase in thinking time throughout training, driven solely by intrinsic adaptation rather than external modifications. Leveraging long CoT, the model progressively refines its reasoning, generating hundreds to thousands of tokens to explore and improve its problem-solving strategies.

[ 43] T `body          ` p5 · 10.9pt · 8 lines
      The increase in thinking time fosters the autonomous development of sophisticated behaviors. Specifically, DeepSeek-R1-Zero increasingly exhibits advanced reasoning strategies such as reflective reasoning and systematic exploration of alternative solutions (see Figure 9(a) in Supplementary C.2 for details), significantly boosting its performance on verifiable tasks like math and coding. Notably, during training, DeepSeek-R1-Zero exhibits an “aha moment” (Table 2), characterized by a sudden increase in the use of the word “wait” during reflections (see Figure 9(b) in Supplementary C.2 for details). This moment marks a distinct change in reasoning patterns and clearly shows the self-evolution process of DeepSeek-R1-Zero.

[ 44] T `body          ` p5 · 10.9pt · 5 lines
      The self-evolution of DeepSeek-R1-Zero underscores the power and beauty of RL: rather than explicitly teaching the model how to solve a problem, we simply provide it with the right incentives, and it autonomously develops advanced problem-solving strategies. This serves as a reminder of the potential of RL to unlock higher levels of capabilities in LLMs, paving the way for more autonomous and adaptive models in the future.

## Page 6 (two columns)

[ 45] · `figure-data   ` p6 · 7pt · 1 lines
      DeepSeek

[ 46] · `figure-data   ` p6 · 7pt · 1 lines
      DeepSeek

[ 47] · `figure-data   ` p6 · 7pt · 1 lines
      DeepSeek

[ 48] · `figure-data   ` p6 · 7pt · 1 lines
      DeepSeek

[ 49] · `figure-data   ` p6 · 7pt · 1 lines
      V3 Base

[ 50] · `figure-data   ` p6 · 7pt · 1 lines
      V3 Base

[ 51] · `figure-data   ` p6 · 7pt · 1 lines
      SFT

[ 52] · `figure-data   ` p6 · 7pt · 1 lines
      Non-Reasoning

[ 53] · `figure-data   ` p6 · 7pt · 1 lines
      V3 Base

[ 54] · `figure-data   ` p6 · 7pt · 1 lines
      SFT

[ 55] · `figure-data   ` p6 · 7pt · 1 lines
      Reasoning Prompts

[ 56] · `figure-data   ` p6 · 7.5pt · 1 lines
      Sampling

[ 57] · `figure-data   ` p6 · 7pt · 1 lines
      Cold Start Long CoT

[ 58] · `figure-data   ` p6 · 7pt · 1 lines
      Accuracy & Format

[ 59] · `figure-data   ` p6 · 7pt · 1 lines
      Reasoning

[ 60] · `figure-data   ` p6 · 7pt · 1 lines
      DeepSeek

[ 61] · `figure-data   ` p6 · 7pt · 1 lines
      DeepSeek

[ 62] · `figure-data   ` p6 · 7pt · 1 lines
      DeepSeek

[ 63] · `figure-data   ` p6 · 7pt · 1 lines
      R1 Dev-3

[ 64] · `figure-data   ` p6 · 7pt · 1 lines
      R1 Dev-1

[ 65] · `figure-data   ` p6 · 7pt · 1 lines
      R1 Zero

[ 66] · `figure-data   ` p6 · 7.5pt · 1 lines
      Sampling

[ 67] · `figure-data   ` p6 · 7pt · 1 lines
      Diverse Prompts

[ 68] · `figure-data   ` p6 · 7pt · 1 lines
      Models

[ 69] · `figure-data   ` p6 · 7pt · 1 lines
      Prompts+Responses

[ 70] · `figure-data   ` p6 · 7pt · 1 lines
      Training Algorithms

[ 71] · `figure-data   ` p6 · 7pt · 1 lines
      Prompts

[ 72] · `figure-data   ` p6 · 7pt · 1 lines
      Rewards

[ 73] · `figure-data   ` p6 · 7pt · 1 lines
      Reasoning Prompts

[ 74] · `figure-data   ` p6 · 7pt · 2 lines
      Reasoning Prompts Filter

[ 75] · `figure-data   ` p6 · 7pt · 1 lines
      Refine

[ 76] · `figure-data   ` p6 · 7pt · 1 lines
      Rule-based Reward

[ 77] · `figure-data   ` p6 · 7pt · 1 lines
      Post-Processing

[ 78] · `figure-data   ` p6 · 7pt · 1 lines
      Rule-based Reward

[ 79] · `figure-data   ` p6 · 7pt · 1 lines
      & Preference Reward

[ 80] · `figure-data   ` p6 · 7pt · 1 lines
      & Lang. Consistency

[ 81] · `figure-data   ` p6 · 7pt · 2 lines
      Accuracy DeepSeek & Format V3+Human

[ 82] · `figure-data   ` p6 · 7pt · 1 lines
      DeepSeek

[ 83] · `figure-data   ` p6 · 7pt · 1 lines
      DeepSeek

[ 84] · `figure-data   ` p6 · 7pt · 1 lines
      R1 Dev-2

[ 85] T `figure-caption` p6 · 10.9pt · 2 lines
      Figure 2 | The multi-stage pipeline of DeepSeek-R1. A detailed background on DeepSeek-V3 Base and DeepSeek-V3 is provided in Supplementary A.1. The models DeepSeek-R1 Dev1,

[ 86] T `body          ` p6 · 10.9pt · 1 lines
      Dev2, and Dev3 represent intermediate checkpoints within this pipeline.

[ 87] T `heading       ` p6 · 13pt · 1 lines
      3. DeepSeek-R1

[ 88] T `body          ` p6 · 10.9pt · 4 lines
      Although DeepSeek-R1-Zero exhibits strong reasoning capabilities, it faces several issues. DeepSeek-R1-Zero struggles with challenges like poor readability, and language mixing, as DeepSeek-V3-Base is trained on multiple languages, especially English and Chinese. To address these issues, we develop DeepSeek-R1, whose pipeline is illustrated in Figure 2.

[ 89] T `body          ` p6 · 10.9pt · 8 lines
      In the initial stage, we collect thousands of cold-start data that exhibits a conversational, human-aligned thinking process. RL training is then applied to improve the model performance with the conversational thinking process and language consistency. Subsequently, we apply rejection sampling and SFT once more. This stage incorporates both reasoning and nonreasoning datasets into the SFT process, enabling the model to not only excel in reasoning tasks but also demonstrate advanced writing capabilities. To further align the model with human preferences, we implement a secondary RL stage designed to enhance the model’s helpfulness and harmlessness while simultaneously refining its reasoning capabilities.

[ 90] T `body          ` p6 · 10.9pt · 4 lines
      The remainder of this section details the key components of this pipeline: Section 3.1 introduces the Reward Model utilized in our RL stages, and Section 3.2 elaborates on the specific training methodologies and implementation details. Data we used in this stage is detailed in Supplementary B.3.

[ 91] T `body          ` p6 · 10.9pt · 8 lines · continues on the next page
      3.1. Model-based Rewards For general data, we resort to reward models to capture human preferences in complex and nuanced scenarios. We build upon the DeepSeek-V3 pipeline and adopt a similar distribution of preference pairs and training prompts. For helpfulness, we focus exclusively on the final summary, ensuring that the assessment emphasizes the utility and relevance of the response to the user while minimizing interference with the underlying reasoning process. For harmlessness, we evaluate the entire response of the model, including both the reasoning process and the summary, to identify and mitigate any potential risks, biases, or harmful content that may arise during the generation process.

## Page 7

[ 92] T `body          ` p7 · 10.9pt · 1 lines · (continuation of a paragraph from the previous page)
      during the generation process.

[ 93] T `body          ` p7 · 10.9pt · 13 lines
      Helpful Reward Model Regarding helpful reward model training, we first generate preference pairs by prompting DeepSeek-V3 using the arena-hard prompt format, listed in Supplementary B.2, where each pair consists of a user query along with two candidate responses. For each preference pair, we query DeepSeek-V3 four times, randomly assigning the responses as either Response A or Response B to mitigate positional bias. The final preference score is determined by averaging the four independent judgments, retaining only those pairs where the score difference (Δ) exceeds 1 to ensure meaningful distinctions. Additionally, to minimize length-related biases, we ensure that the chosen and rejected responses of the whole dataset have comparable lengths. In total, we curated 66,000 data pairs for training the reward model. The prompts used in this dataset are all non-reasoning questions and are sourced either from publicly available open-source datasets or from users who have explicitly consented to share their data for the purpose of model improvement. The architecture of our reward model is consistent with that of DeepSeek-R1, with the addition of a reward head designed to predict scalar preference scores.

[ 94] T `body          ` p7 · 10.9pt · 3 lines
      The helpful reward models were trained with a batch size of 256, a learning rate of 6e-6, and for a single epoch over the training dataset. The maximum sequence length during training is set to 8192 tokens, whereas no explicit limit is imposed during reward model inference.

[ 95] T `body          ` p7 · 10.9pt · 5 lines
      Safety Reward Model To assess and improve model safety, we curated a dataset of 106,000 prompts with model-generated responses annotated as “safe" or “unsafe" according to predefined safety guidelines. Unlike the pairwise loss employed in the helpfulness reward model, the safety reward model was trained using a point-wise methodology to distinguish between safe and unsafe responses. The training hyperparameters are the same as the helpful reward model.

[ 96] T `body          ` p7 · 10.9pt · 3 lines
      For general queries, each instance is categorized as belonging to either the safety dataset or the helpfulness dataset. The general reward, 𝑅𝑒𝑤𝑎𝑟𝑑𝐺𝑒𝑛𝑒𝑟𝑎𝑙, assigned to each query corresponds to the respective reward defined within the associated dataset.

[ 97] T `body          ` p7 · 10.9pt · 10 lines
      3.2. Training Details 3.2.1. Training Details of the First RL Stage In the first stage of RL, we set the learning rate to 3e-6, the KL coefficient to 0.001, the GRPO clip ratio 𝜀 to 10, and the sampling temperature to 1 for rollout. For each question, we sample 16 outputs with a maximum length of 32,768. Each training step consists of 32 unique questions, resulting in a training batch size of 512 per step. Every 400 steps, we replace the reference model with the latest policy model. To accelerate training, each rollout generates 8,192 outputs, which are randomly split into 16 minibatches and trained for only a single inner epoch. However, to mitigate the issue of language mixing, we introduce a language consistency reward during RL training, which is calculated as the proportion of target language words in the CoT.

## Page 8

[ 98] T `body          ` p8 · 10.9pt · 4 lines
      Although ablation experiments in Supplementary B.6 show that such alignment results in a slight degradation in the model’s performance, this reward aligns with human preferences, making it more readable. We apply the language consistency reward to both reasoning and non-reasoning data by directly adding it to the final reward.

[ 99] T `body          ` p8 · 10.9pt · 3 lines
      Note that the clip ratio plays a crucial role in training. A lower value can lead to the truncation of gradients for a significant number of tokens, thereby degrading the model’s performance, while a higher value may cause instability during training.

[100] T `body          ` p8 · 10.9pt · 16 lines
      3.2.2. Training Details of the Second RL Stage Specifically, we train the model using a combination of reward signals and diverse prompt distributions. For reasoning data, we follow the methodology outlined in DeepSeek-R1-Zero, which employs rule-based rewards to guide learning in mathematical, coding, and logical reasoning domains. During the training process, we observe that CoT often exhibits language mixing, particularly when RL prompts involve multiple languages. For general data, we utilize reward models to guide training. Ultimately, the integration of reward signals with diverse data distributions enables us to develop a model that not only excels in reasoning but also prioritizes helpfulness and harmlessness. Given a batch of data, the reward can be formulated as The second stage of RL retains most of the parameters from the first stage, with the key difference being a reduced temperature of 0.7, as we find that higher temperatures in this stage lead to incoherent generation. The stage comprises a total of 1,700 training steps, during which general instruction data and preference-based rewards are incorporated exclusively in the final 400 steps. We find that more training steps with the model based preference reward signal may lead to reward hacking, which is documented in Supplementary B.5. The total training cost is listed in Supplementary B.4.4.

[101] T `heading       ` p8 · 13pt · 1 lines
      4. Experiment

[102] · `table         ` p8 · 10.9pt · 8 lines
      We evaluate our models on MMLU (Hendrycks et al., 2021), MMLU-Redux (Gema et al., 2025), MMLU-Pro (Wang et al., 2024), C-Eval (Huang et al., 2023), and CMMLU (Li et al., 2024), IFEval (Zhou et al., 2023b), FRAMES (Krishna et al., 2024), GPQA Diamond (Rein et al., 2023), SimpleQA (OpenAI, 2024a), C-SimpleQA (He et al., 2024), SWE-Bench Verified (OpenAI, 2024b), Aider (Gauthier, 2025), LiveCodeBench (Jain et al., 2024) (2024-08 – 2025-01), Codeforces (Mirzayanov, 2025), Chinese National High School Mathematics Olympiad (CNMO 2024) (CMS, 2024), and American Invitational Mathematics Examination 2024 (AIME 2024) (MAA, 2024). The details of these benchmarks are listed in Supplementary D.

[103] T `body          ` p8 · 10.9pt · 6 lines
      Table 3 summarizes the performance of DeepSeek-R1 across multiple developmental stages, as outlined in Figure 2. A comparison between DeepSeek-R1-Zero and DeepSeek-R1 Dev1 reveals substantial improvements in instruction-following, as evidenced by higher scores on the IF-Eval and ArenaHard benchmarks. However, due to the limited size of the cold-start dataset, Dev1 exhibits a partial degradation in reasoning performance compared to DeepSeek-R1-Zero, most notably on the AIME benchmark. In contrast, DeepSeek-R1 Dev2 demonstrates
