# Segmentation dump: DeepSeek-V2.pdf

- pages: 8 / 52
- paragraphs (canonical): 115
- page-break joins: 3
- translatable: 35
- body font size: 10.9
- extract time: 103 ms
- font tiers: body=10.9 h1=15.9 h2=14.9 h3=13

Legend: `T` = translated, `·` = skipped. Roles: title/author/heading/abstract/body/
figure-caption/table-caption/keywords are translated; table/formula/toc/
figure-data/pageNoise/footnote/meta are not.

## Page 1 (two columns)

[  1] T `title         ` p1 · 15.9pt · 2 lines
      DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model

[  2] · `author        ` p1 · 11pt · 2 lines
      DeepSeek-AI research@deepseek.com

[  3] T `heading       ` p1 · 14.9pt · 1 lines
      Abstract

[  4] T `abstract      ` p1 · 11pt · 14 lines
      We present DeepSeek-V2, a strong Mixture-of-Experts (MoE) language model characterized by economical training and effici…

[  5] · `figure-data   ` p1 · 7.2pt · 1 lines
      80 DeepSeek-V2

[  6] · `figure-data   ` p1 · 6.4pt · 1 lines
      LLaMA 3 70B

[  7] · `figure-data   ` p1 · 6.4pt · 1 lines
      Mixtral 8x22B

[  8] · `figure-data   ` p1 · 6.4pt · 1 lines
      Command R+

[  9] · `figure-data   ` p1 · 6.2pt · 1 lines
      Training Costs (K GPU Hours/T Tokens)

[ 10] · `figure-data   ` p1 · 5.3pt · 1 lines
      DeepSeek 67B

[ 11] · `figure-data   ` p1 · 6.4pt · 1 lines
      Qwen1.5 72B

[ 12] · `figure-data   ` p1 · 6.4pt · 1 lines
      DBRX

[ 13] · `figure-data   ` p1 · 6.4pt · 1 lines
      DeepSeek 67B

[ 14] · `figure-data   ` p1 · 6.4pt · 1 lines
      Qwen1.5 32B

[ 15] · `figure-data   ` p1 · 6.4pt · 1 lines
      Grok-1

[ 16] · `figure-data   ` p1 · 6.4pt · 1 lines
      Mixtral 8x7B

[ 17] · `figure-data   ` p1 · 6.4pt · 1 lines
      LLaMA 2 70B

[ 18] · `figure-data   ` p1 · 6.4pt · 1 lines
      Command R

[ 19] · `table         ` p1 · 7.2pt · 1 lines
      65 LLaMA 3 8B

[ 20] · `figure-data   ` p1 · 6.4pt · 1 lines
      LLaMA 1 65B

[ 21] · `figure-data   ` p1 · 6.4pt · 1 lines
      LLaMA 2 34B

[ 22] · `figure-data   ` p1 · 5.1pt · 1 lines
      LLaMA 1 Family

[ 23] · `figure-data   ` p1 · 6.4pt · 1 lines
      Mistral 7B

[ 24] · `figure-data   ` p1 · 5.1pt · 3 lines
      LLaMA 2 Family LLaMA 3 Family Mixtral Family

[ 25] · `figure-data   ` p1 · 6.4pt · 1 lines
      LLaMA 1 33B

[ 26] · `figure-data   ` p1 · 5.1pt · 1 lines
      Command R Family

[ 27] · `figure-data   ` p1 · 5.3pt · 1 lines
      saving 42.5% of

[ 28] · `figure-data   ` p1 · 5.3pt · 1 lines
      DeepSeek-V2

[ 29] · `figure-data   ` p1 · 5.3pt · 1 lines
      training costs

[ 30] · `figure-data   ` p1 · 6.2pt · 1 lines
      KV Cache for Generation (KB/Token)

[ 31] · `figure-data   ` p1 · 5.3pt · 1 lines
      DeepSeek 67B

[ 32] · `figure-data   ` p1 · 5.3pt · 1 lines
      reducing KV cache by 93.3%

[ 33] · `figure-data   ` p1 · 5.3pt · 1 lines
      DeepSeek-V2

[ 34] · `figure-data   ` p1 · 6.2pt · 1 lines
      Maximum Generation Throughput (Tokens/Sec)

[ 35] · `figure-data   ` p1 · 5.3pt · 1 lines
      DeepSeek 67B

[ 36] · `figure-data   ` p1 · 5.1pt · 1 lines
      Qwen1.5 Family

[ 37] · `figure-data   ` p1 · 6.4pt · 1 lines
      LLaMA 2 13B

[ 38] · `figure-data   ` p1 · 5.3pt · 1 lines
      576% of maximum throughput

[ 39] · `figure-data   ` p1 · 5.3pt · 1 lines
      DeepSeek-V2

[ 40] · `figure-data   ` p1 · 8.5pt · 1 lines
      Activated Parameters (Billions)

[ 41] T `figure-caption` p1 · 10.9pt · 2 lines
      Figure 1 | (a) MMLU accuracy vs. activated parameters, among different open-source models. (b) Training costs and infere…

## Page 2

[ 42] · `toc           ` p2 · 13pt · 1 lines
      Contents

[ 43] · `toc           ` p2 · 10.9pt · 1 lines
      1 Introduction 4

[ 44] · `toc           ` p2 · 10.9pt · 2 lines
      2 Architecture 6 2.1 Multi-Head Latent Attention: Boosting Inference Efficiency . . . . . . . . . . . . . 6

[ 45] · `toc           ` p2 · 10.9pt · 1 lines
      2.2 DeepSeekMoE: Training Strong Models at Economical Costs . . . . . . . . . . . . 9

[ 46] · `toc           ` p2 · 10.9pt · 1 lines
      3 Pre-Training 11

[ 47] · `toc           ` p2 · 10.9pt · 1 lines
      4 Alignment 16

[ 48] · `toc           ` p2 · 10.9pt · 1 lines
      5 Conclusion, Limitation, and Future Work 21

[ 49] · `toc           ` p2 · 10.9pt · 1 lines
      A Contributions and Acknowledgments 27

[ 50] · `toc           ` p2 · 10.9pt · 1 lines
      B DeepSeek-V2-Lite: A 16B Model Equipped with MLA and DeepSeekMoE 29

## Page 3

[ 51] · `toc           ` p3 · 10.9pt · 1 lines
      C Full Formulas of MLA 31

[ 52] · `toc           ` p3 · 10.9pt · 1 lines
      D Ablation of Attention Mechanisms 31

[ 53] · `toc           ` p3 · 10.9pt · 1 lines
      E Discussion About Pre-Training Data Debiasing 32

[ 54] · `toc           ` p3 · 10.9pt · 1 lines
      F Additional Evaluations on Math and Code 32

[ 55] · `toc           ` p3 · 10.9pt · 1 lines
      G Evaluation Formats 33

## Page 4

[ 56] T `heading       ` p4 · 13pt · 1 lines
      1. Introduction

[ 57] T `body          ` p4 · 10.9pt · 11 lines
      In the past few years, Large Language Models (LLMs) (Anthropic, 2023; Google, 2023; OpenAI, 2022, 2023) have undergone r…

[ 58] T `body          ` p4 · 10.9pt · 19 lines
      We optimize the attention modules and Feed-Forward Networks (FFNs) within the Transformer framework (Vaswani et al., 201…

[ 59] T `body          ` p4 · 10.9pt · 1 lines
      We construct a high-quality and multi-source pre-training corpus consisting of 8.1T tokens.

[ 60] T `body          ` p4 · 10.9pt · 7 lines
      Compared with the corpus used in DeepSeek 67B (our previous release) (DeepSeek-AI, 2024), this corpus features an extend…

[ 61] T `body          ` p4 · 10.9pt · 8 lines · continues on the next page
      We evaluate DeepSeek-V2 on a wide range of benchmarks in English and Chinese, and compare it with representative open-so…

## Page 5 (two columns)

[ 62] · `figure-data   ` p5 · 8.9pt · 1 lines
      DeepSeekMoE

[ 63] · `figure-data   ` p5 · 8.9pt · 1 lines
      Output Hidden 𝐡𝐡 ′𝑡𝑡

[ 64] · `figure-data   ` p5 · 8.9pt · 1 lines
      Routed Expert

[ 65] · `figure-data   ` p5 · 8.9pt · 1 lines
      Transformer Block ×𝐿𝐿

[ 66] · `figure-data   ` p5 · 8.9pt · 1 lines
      Shared Expert

[ 67] · `figure-data   ` p5 · 8.9pt · 1 lines
      Feed-Forward Network

[ 68] · `figure-data   ` p5 · 8.9pt · 1 lines
      RMS Norm

[ 69] · `figure-data   ` p5 · 8.9pt · 1 lines
      Multi-Head Latent Attention (MLA)

[ 70] · `figure-data   ` p5 · 8.9pt · 1 lines
      Router

[ 71] · `figure-data   ` p5 · 8.9pt · 1 lines
      Input Hidden 𝐮𝐮𝑡𝑡

[ 72] · `figure-data   ` p5 · 8.9pt · 1 lines
      Attention

[ 73] · `figure-data   ` p5 · 8.9pt · 1 lines
      Output Hidden 𝐮𝐮𝑡𝑡

[ 74] · `figure-data   ` p5 · 8.9pt · 1 lines
      Cached During Inference

[ 75] · `figure-data   ` p5 · 8.9pt · 1 lines
      RMS Norm

[ 76] · `figure-data   ` p5 · 7.1pt · 1 lines
      concatenate

[ 77] · `figure-data   ` p5 · 8.9pt · 1 lines
      Multi-Head Attention

[ 78] · `figure-data   ` p5 · 7.1pt · 1 lines
      concatenate

[ 79] · `figure-data   ` p5 · 8.9pt · 1 lines
      Input Hidden 𝐡𝐡𝑡𝑡

[ 80] · `figure-data   ` p5 · 7.1pt · 2 lines
      apply apply RoPE RoPE

[ 81] T `figure-caption` p5 · 10.9pt · 3 lines
      Figure 2 | Illustration of the architecture of DeepSeek-V2. MLA ensures efficient inference by significantly reducing th…

[ 82] T `body          ` p5 · 10.9pt · 7 lines · (continuation of a paragraph from the previous page)
      DeepSeek-V2 Chat (RL) on open-ended benchmarks. Notably, DeepSeek-V2 Chat (RL) achieves 38.9 length-controlled win rate…

[ 83] T `body          ` p5 · 10.9pt · 4 lines
      In order to facilitate further research and development on MLA and DeepSeekMoE, we also release DeepSeek-V2-Lite, a smal…

[ 84] T `body          ` p5 · 10.9pt · 5 lines
      In the rest of this paper, we first provide a detailed description of the model architecture of DeepSeek-V2 (Section 2).…

## Page 6

[ 85] T `body          ` p6 · 10.9pt · 3 lines
      Learning (RL), the evaluation results, and other discussion (Section 4). Finally, we summarize the conclusion, deliberat…

[ 86] T `heading       ` p6 · 13pt · 1 lines
      2. Architecture

[ 87] T `body          ` p6 · 10.9pt · 11 lines
      By and large, DeepSeek-V2 is still in the Transformer architecture (Vaswani et al., 2017), where each Transformer block…

[ 88] T `body          ` p6 · 10.9pt · 7 lines
      2.1. Multi-Head Latent Attention: Boosting Inference Efficiency Conventional Transformer models usually adopts Multi-Hea…

[ 89] T `body          ` p6 · 10.9pt · 4 lines
      For DeepSeek-V2, we design an innovative attention mechanism called Multi-head Latent Attention (MLA). Equipped with low…

[ 90] T `body          ` p6 · 10.9pt · 1 lines
      Appendix D.2.

[ 91] T `body          ` p6 · 10.9pt · 4 lines · continues on the next page
      2.1.1. Preliminaries: Standard Multi-Head Attention We first introduce the standard MHA mechanism as background. Let 𝑑 b…

## Page 7 (two columns)

[ 92] · `figure-data   ` p7 · 7.3pt · 1 lines
      Multi-Head Attention (MHA) Grouped-Query Attention (GQA) Multi-Query Attention (MQA) Multi-Head Latent Attention (MLA)

[ 93] · `figure-data   ` p7 · 6.9pt · 1 lines
      Cached During Inference

[ 94] · `figure-data   ` p7 · 6.9pt · 1 lines
      Values

[ 95] · `figure-data   ` p7 · 6.9pt · 1 lines
      Keys

[ 96] · `figure-data   ` p7 · 6.9pt · 1 lines
      Queries

[ 97] T `figure-caption` p7 · 10.9pt · 1 lines
      Figure 3 | Simplified illustration of Multi-Head Attention (MHA), Grouped-Query Atten-

[ 98] · `figure-data   ` p7 · 6.1pt · 1 lines
      projection

[ 99] · `figure-data   ` p7 · 6.9pt · 2 lines
      Compressed Latent KV

[100] T `body          ` p7 · 10.9pt · 3 lines · (continuation of a paragraph from the previous page)
      tion (GQA), Multi-Query Attention (MQA), and Multi-head Latent Attention (MLA). Through jointly compressing the keys and…

[101] T `body          ` p7 · 10.9pt · 1 lines
      Then, q𝑡 , k𝑡 , v𝑡 will be sliced into 𝑛ℎ heads for the multi-head attention computation:

[102] T `body          ` p7 · 10.9pt · 1 lines
      where q𝑡,𝑖, k𝑡,𝑖, v𝑡,𝑖 ∈ R𝑑ℎ denote the query, key, and value of the 𝑖-th attention head, respectively;

[103] · `figure-data   ` p7 · 7.3pt · 1 lines
      𝑊𝑂 ∈ R𝑑×𝑑ℎ 𝑛ℎ denotes the output projection matrix. During inference, all keys and values need

[104] T `body          ` p7 · 10.5pt · 3 lines
      to be cached to accelerate inference, so MHA needs to cache 2𝑛ℎ𝑑ℎ𝑙 elements for each token. In model deployment, this he…

[105] T `body          ` p7 · 10.9pt · 2 lines
      2.1.2. Low-Rank Key-Value Joint Compression The core of MLA is the low-rank joint compression for keys and values to red…

[106] T `body          ` p7 · 10.5pt · 6 lines
      where c𝑡𝐾𝑉 ∈ R𝑑𝑐 is the compressed latent vector for keys and values; 𝑑𝑐 (≪ 𝑑ℎ𝑛ℎ) denotes the KV are the up-projection m…

[107] T `body          ` p7 · 10.9pt · 1 lines · continues on the next page
      Moreover, in order to reduce the activation memory during training, we also perform low-rank compression for the queries…

## Page 8 (two columns)

[108] T `body          ` p8 · 10.9pt · 1 lines · (continuation of a paragraph from the previous page)
      low-rank compression for the queries, even if it cannot reduce the KV cache:

[109] T `body          ` p8 · 10pt · 1 lines
      where c𝑡𝑄 ∈ R𝑑𝑐′ is the compressed latent vector for queries; 𝑑𝑐′ (≪ 𝑑ℎ𝑛ℎ) denotes the query

[110] · `figure-data   ` p8 · 7.3pt · 1 lines
      compression dimension; and 𝑊 𝐷𝑄 ∈ R𝑑𝑐 ×𝑑 , 𝑊𝑈𝑄 ∈ R𝑑ℎ 𝑛ℎ ×𝑑𝑐 are the down-projection and up-

[111] T `body          ` p8 · 10.9pt · 1 lines
      projection matrices for queries, respectively.

[112] T `body          ` p8 · 10.9pt · 5 lines
      2.1.3. Decoupled Rotary Position Embedding Following DeepSeek 67B (DeepSeek-AI, 2024), we intend to use the Rotary Posit…

[113] T `body          ` p8 · 10.5pt · 4 lines
      In this way, 𝑊𝑈 𝐾 cannot be absorbed into 𝑊𝑄 any more during inference, since a RoPE matrix related to the currently gen…

[114] T `body          ` p8 · 10.9pt · 4 lines
      As a solution, we propose the decoupled RoPE strategy that uses additional multi-head queries q ∈ R ℎ and a shared key k…

[115] · `figure-data   ` p8 · 7.3pt · 1 lines
      where 𝑊𝑄𝑅 ∈ R𝑑ℎ 𝑛ℎ ×𝑑𝑐 and 𝑊 𝐾𝑅 ∈ R𝑑ℎ ×𝑑 are matrices to produce the decouples queries and key,

[116] T `body          ` p8 · 10.9pt · 3 lines
      respectively; RoPE(·) denotes the operation that applies RoPE matrices; and [·; ·] denotes the concatenation operation.…

[117] T `body          ` p8 · 10.9pt · 2 lines
      In order to demonstrate the complete computation process of MLA, we also organize and provide its full formulas in Appen…

[118] T `body          ` p8 · 10.9pt · 4 lines
      2.1.4. Comparison of Key-Value Cache We demonstrate a comparison of the KV cache per token among different attention mec…
