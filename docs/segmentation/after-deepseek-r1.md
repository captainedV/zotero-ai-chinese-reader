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
      General reasoning represents a long-standing and formidable challenge in artificial intelligence. Recent breakthroughs,…

[  5] T `heading       ` p1 · 13pt · 1 lines
      1. Introduction

[  6] T `body          ` p1 · 10.9pt · 16 lines · continues on the next page
      Reasoning capability, the cornerstone of human intelligence, enables complex cognitive tasks ranging from mathematical p…

## Page 2

[  7] T `body          ` p2 · 10.9pt · 2 lines · (continuation of a paragraph from the previous page)
      provided exemplars, which prevents the exploration of superior, non-human-like reasoning pathways.

[  8] T `body          ` p2 · 10.9pt · 15 lines
      To tackle these issues, we aim to explore the potential of LLMs for developing reasoning abilities through self-evolutio…

[  9] T `body          ` p2 · 10.9pt · 10 lines
      Although DeepSeek-R1-Zero demonstrates excellent reasoning capabilities, it faces challenges such as poor readability an…

[ 10] T `body          ` p2 · 10.9pt · 8 lines
      To enable broader access to powerful AI at a lower energy cost, we have distilled several smaller models and made them p…

[ 11] T `heading       ` p2 · 13pt · 1 lines
      2. DeepSeek-R1-Zero

[ 12] T `body          ` p2 · 10.9pt · 3 lines
      We begin by elaborating on the training of DeepSeek-R1-Zero, which relies exclusively on reinforcement learning without…

[ 13] T `body          ` p2 · 10.9pt · 5 lines
      2.1. Group Relative Policy Optimization GRPO (Shao et al., 2024) is the reinforcement learning algorithm that we adopt t…

## Page 3 (two columns)

[ 14] T `body          ` p3 · 10.9pt · 2 lines
      For each question 𝑞, GRPO samples a group of outputs {𝑜1, 𝑜2, · · · , 𝑜𝐺 } from the old policy 𝜋𝜃𝑜𝑙𝑑 and then optimizes…

[ 15] · `figure-data   ` p3 · 10.9pt · 1 lines
      min

[ 16] T `body          ` p3 · 10.9pt · 3 lines
      − log where 𝜋𝑟𝑒 𝑓 is a reference policy, 𝜀 and 𝛽 are hyper-parameters, and 𝐴𝑖 is the advantage, computed using a group o…

[ 17] T `body          ` p3 · 10.9pt · 9 lines
      We give a comparison of GRPO and PPO in Supplementary A.3. To train DeepSeek-R1-Zero, we set the learning rate to 3e-6,…

[ 18] T `table-caption ` p3 · 10.9pt · 2 lines
      Table 1 | Template for DeepSeek-R1-Zero. prompt will be replaced with the specific reasoning question during training.

[ 19] T `body          ` p3 · 10pt · 5 lines
      A conversation between User and Assistant. The user asks a question, and the Assistant solves it. The assistant first th…

[ 20] T `body          ` p3 · 10.9pt · 2 lines
      Our high-performance RL infrastructure is described in Supplementary B.1, ensuring scalable and efficient training.

[ 21] T `body          ` p3 · 10.9pt · 5 lines
      2.2. Reward Design The reward is the source of the training signal, which decides the direction of RL optimization. For…

[ 22] T `body          ` p3 · 10.9pt · 4 lines · continues on the next page
      Accuracy rewards evaluate whether the response is correct. For example, in the case of math problems with deterministic…

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
      Figure 1 | (a) AIME accuracy of DeepSeek-R1-Zero during training. AIME takes a mathematical problem as input and a numbe…

[ 29] · `figure-data   ` p4 · 4.9pt · 1 lines
      Steps

[ 30] T `body          ` p4 · 10.9pt · 2 lines · (continuation of a paragraph from the previous page)
      responses against a suite of predefined test cases, thereby generating objective feedback on correctness.

[ 31] T `body          ` p4 · 10.9pt · 4 lines
      Format rewards complement the accuracy reward model by enforcing specific formatting requirements. In particular, the mo…

[ 32] T `body          ` p4 · 10.9pt · 6 lines
      The accuracy, reward and format reward are combined with the same weight. Notably, we abstain from applying neural rewar…

[ 33] T `body          ` p4 · 10.9pt · 6 lines
      2.3. Incentivize Reasoning Capability in LLMs Specifically, we apply the RL technique on the DeepSeek-V3 base to train D…

[ 34] T `body          ` p4 · 10.9pt · 4 lines · continues on the next page
      Figure 1(a) depicts the performance trajectory of DeepSeek-R1-Zero on the AIME 2024 benchmark throughout the RL training…

## Page 5

[ 35] T `table-caption ` p5 · 10.9pt · 3 lines
      Table 2 | An interesting “aha moment” of an intermediate version of DeepSeek-R1-Zero. The model learns to rethink using…

[ 36] T `body          ` p5 · 10.9pt · 5 lines · (continuation of a paragraph from the previous page)
      Question: If 𝑎 > 1, then the sum of the real solutions of 𝑎 − 𝑎 + 𝑥 = 𝑥 is equal to Response: <think> To solve the equat…

[ 37] T `body          ` p5 · 10.9pt · 1 lines
      Wait, wait. Wait. That’s an aha moment I can flag here.

[ 38] T `body          ` p5 · 10.9pt · 4 lines
      Let’s reevaluate this step-by-step to identify if the correct sum can be · · · We started with the equation: √︁ First, l…

[ 39] T `body          ` p5 · 10.9pt · 2 lines
      Next, I could square both sides again, treating the equation: · · ·. . .

[ 40] T `body          ` p5 · 10.9pt · 5 lines
      further improved, achieving an accuracy of 86.7%. This performance significantly surpasses the average performance acros…

[ 41] T `body          ` p5 · 10.9pt · 2 lines
      The self-evolution of DeepSeek-R1-Zero exemplifies how RL can autonomously enhance a model’s reasoning capabilities.

[ 42] T `body          ` p5 · 10.9pt · 4 lines
      As shown in Figure 1(b), DeepSeek-R1-Zero exhibits a steady increase in thinking time throughout training, driven solely…

[ 43] T `body          ` p5 · 10.9pt · 8 lines
      The increase in thinking time fosters the autonomous development of sophisticated behaviors. Specifically, DeepSeek-R1-Z…

[ 44] T `body          ` p5 · 10.9pt · 5 lines
      The self-evolution of DeepSeek-R1-Zero underscores the power and beauty of RL: rather than explicitly teaching the model…

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
      Figure 2 | The multi-stage pipeline of DeepSeek-R1. A detailed background on DeepSeek-V3 Base and DeepSeek-V3 is provide…

[ 86] T `body          ` p6 · 10.9pt · 1 lines
      Dev2, and Dev3 represent intermediate checkpoints within this pipeline.

[ 87] T `heading       ` p6 · 13pt · 1 lines
      3. DeepSeek-R1

[ 88] T `body          ` p6 · 10.9pt · 4 lines
      Although DeepSeek-R1-Zero exhibits strong reasoning capabilities, it faces several issues. DeepSeek-R1-Zero struggles wi…

[ 89] T `body          ` p6 · 10.9pt · 8 lines
      In the initial stage, we collect thousands of cold-start data that exhibits a conversational, human-aligned thinking pro…

[ 90] T `body          ` p6 · 10.9pt · 4 lines
      The remainder of this section details the key components of this pipeline: Section 3.1 introduces the Reward Model utili…

[ 91] T `body          ` p6 · 10.9pt · 8 lines · continues on the next page
      3.1. Model-based Rewards For general data, we resort to reward models to capture human preferences in complex and nuance…

## Page 7

[ 92] T `body          ` p7 · 10.9pt · 1 lines · (continuation of a paragraph from the previous page)
      during the generation process.

[ 93] T `body          ` p7 · 10.9pt · 13 lines
      Helpful Reward Model Regarding helpful reward model training, we first generate preference pairs by prompting DeepSeek-V…

[ 94] T `body          ` p7 · 10.9pt · 3 lines
      The helpful reward models were trained with a batch size of 256, a learning rate of 6e-6, and for a single epoch over th…

[ 95] T `body          ` p7 · 10.9pt · 5 lines
      Safety Reward Model To assess and improve model safety, we curated a dataset of 106,000 prompts with model-generated res…

[ 96] T `body          ` p7 · 10.9pt · 3 lines
      For general queries, each instance is categorized as belonging to either the safety dataset or the helpfulness dataset.…

[ 97] T `body          ` p7 · 10.9pt · 10 lines
      3.2. Training Details 3.2.1. Training Details of the First RL Stage In the first stage of RL, we set the learning rate t…

## Page 8

[ 98] T `body          ` p8 · 10.9pt · 4 lines
      Although ablation experiments in Supplementary B.6 show that such alignment results in a slight degradation in the model…

[ 99] T `body          ` p8 · 10.9pt · 3 lines
      Note that the clip ratio plays a crucial role in training. A lower value can lead to the truncation of gradients for a s…

[100] T `body          ` p8 · 10.9pt · 16 lines
      3.2.2. Training Details of the Second RL Stage Specifically, we train the model using a combination of reward signals an…

[101] T `heading       ` p8 · 13pt · 1 lines
      4. Experiment

[102] · `table         ` p8 · 10.9pt · 8 lines
      We evaluate our models on MMLU (Hendrycks et al., 2021), MMLU-Redux (Gema et al., 2025), MMLU-Pro (Wang et al., 2024), C…

[103] T `body          ` p8 · 10.9pt · 6 lines
      Table 3 summarizes the performance of DeepSeek-R1 across multiple developmental stages, as outlined in Figure 2. A compa…
