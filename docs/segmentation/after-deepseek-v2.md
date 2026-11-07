# Segmentation dump: DeepSeek-V2.pdf

- pages: 8 / 52
- paragraphs (canonical): 110
- page-break joins: 2
- translatable: 33
- body font size: 10.9
- extract time: 101 ms
- font tiers: body=10.9 h1=16 h2=15 h3=13

Legend: `T` = translated, `·` = skipped. Roles: title/author/heading/abstract/body/
figure-caption/table-caption/keywords are translated; table/formula/toc/
figure-data/pageNoise/footnote/meta are not.

## Page 1 (two columns)

[  1] T `title         ` p1 · 16pt · 2 lines
      DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model

[  2] · `author        ` p1 · 11pt · 2 lines
      DeepSeek-AI research@deepseek.com

[  3] T `heading       ` p1 · 15pt · 1 lines
      Abstract

[  4] T `abstract      ` p1 · 11pt · 14 lines
      We present DeepSeek-V2, a strong Mixture-of-Experts (MoE) language model characterized by economical training and efficient inference. It comprises 236B total parameters, of which 21B are activated for each token, and supports a context length of 128K tokens. DeepSeek-V2 adopts innovative architectures including Multi-head Latent Attention (MLA) and DeepSeekMoE. MLA guarantees efficient inference through significantly compressing the Key-Value (KV) cache into a latent vector, while DeepSeekMoE enables training strong models at an economical cost through sparse computation. Compared with DeepSeek 67B, DeepSeek-V2 achieves significantly stronger performance, and meanwhile saves 42.5% of training costs, reduces the KV cache by 93.3%, and boosts the maximum generation throughput to 5.76 times. We pretrain DeepSeek-V2 on a high-quality and multi-source corpus consisting of 8.1T tokens, and further perform Supervised Fine-Tuning (SFT) and Reinforcement Learning (RL) to fully unlock its potential. Evaluation results show that, even with only 21B activated parameters, DeepSeek-V2 and its chat versions still achieve top-tier performance among open-source models. The model checkpoints are available at https://github.com/deepseek-ai/DeepSeek-V2.

[  5] · `figure-data   ` p1 · 6.4pt · 1 lines
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

[ 19] · `table         ` p1 · 6.4pt · 1 lines
      65 LLaMA 3 8B

[ 20] · `figure-data   ` p1 · 6.4pt · 1 lines
      LLaMA 1 65B

[ 21] · `figure-data   ` p1 · 6.4pt · 1 lines
      LLaMA 2 34B

[ 22] · `figure-data   ` p1 · 5.1pt · 1 lines
      LLaMA 1 Family

[ 23] · `figure-data   ` p1 · 7.3pt · 2 lines
      Mistral 7B 60

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
      Figure 1 | (a) MMLU accuracy vs. activated parameters, among different open-source models. (b) Training costs and inference efficiency of DeepSeek 67B (Dense) and DeepSeek-V2.

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
      In the past few years, Large Language Models (LLMs) (Anthropic, 2023; Google, 2023; OpenAI, 2022, 2023) have undergone rapid development, offering a glimpse into the dawn of Artificial General Intelligence (AGI). In general, the intelligence of an LLM tends to improve as the number of parameters increases, allowing it to exhibit emergent capabilities across various tasks (Wei et al., 2022). However, the improvement comes at the cost of larger computing resources for training and a potential decrease in inference throughput. These constraints present significant challenges that impede the widespread adoption and utilization of LLMs. In order to tackle this problem, we introduce DeepSeek-V2, a strong open-source Mixture-of-Experts (MoE) language model, characterized by economical training and efficient inference through an innovative Transformer architecture. It is equipped with a total of 236B parameters, of which 21B are activated for each token, and supports a context length of 128K tokens.

[ 58] T `body          ` p4 · 10.9pt · 19 lines
      We optimize the attention modules and Feed-Forward Networks (FFNs) within the Transformer framework (Vaswani et al., 2017) with our proposed Multi-head Latent Attention (MLA) and DeepSeekMoE. (1) In the context of attention mechanisms, the Key-Value (KV) cache of the Multi-Head Attention (MHA) (Vaswani et al., 2017) poses a significant obstacle to the inference efficiency of LLMs. Various approaches have been explored to address this issue, including Grouped-Query Attention (GQA) (Ainslie et al., 2023) and Multi-Query Attention (MQA) (Shazeer, 2019). However, these methods often compromise performance in their attempt to reduce the KV cache. In order to achieve the best of both worlds, we introduce MLA, an attention mechanism equipped with low-rank key-value joint compression. Empirically, MLA achieves superior performance compared with MHA, and meanwhile significantly reduces the KV cache during inference, thus boosting the inference efficiency. (2) For Feed-Forward Networks (FFNs), we follow the DeepSeekMoE architecture (Dai et al., 2024), which adopts fine-grained expert segmentation and shared expert isolation for higher potential in expert specialization. The DeepSeekMoE architecture demonstrates great advantages compared with conventional MoE architectures like GShard (Lepikhin et al., 2021), enabling us to train strong models at an economical cost. As we employ expert parallelism during training, we also devise supplementary mechanisms to control communication overheads and ensure load balance. By combining these two techniques, DeepSeek-V2 features strong performance (Figure 1(a)), economical training costs, and efficient inference throughput (Figure 1(b)), simultaneously.

[ 59] T `body          ` p4 · 10.9pt · 1 lines
      We construct a high-quality and multi-source pre-training corpus consisting of 8.1T tokens.

[ 60] T `body          ` p4 · 10.9pt · 7 lines
      Compared with the corpus used in DeepSeek 67B (our previous release) (DeepSeek-AI, 2024), this corpus features an extended amount of data, especially Chinese data, and higher data quality. We first pretrain DeepSeek-V2 on the full pre-training corpus. Then, we collect 1.5M conversational sessions, which encompass various domains such as math, code, writing, reasoning, safety, and more, to perform Supervised Fine-Tuning (SFT) for DeepSeek-V2 Chat (SFT). Finally, we follow DeepSeekMath (Shao et al., 2024) to employ Group Relative Policy Optimization (GRPO) to further align the model with human preference and produce DeepSeek-V2 Chat (RL).

[ 61] T `body          ` p4 · 10.9pt · 8 lines · continues on the next page
      We evaluate DeepSeek-V2 on a wide range of benchmarks in English and Chinese, and compare it with representative open-source models. Evaluation results show that even with only 21B activated parameters, DeepSeek-V2 still achieves top-tier performance among open-source models and becomes the strongest open-source MoE language model. Figure 1(a) highlights that, on MMLU, DeepSeek-V2 achieves top-ranking performance with only a small number of activated parameters. In addition, as shown in Figure 1(b), compared with DeepSeek 67B, DeepSeek-V2 saves 42.5% of training costs, reduces the KV cache by 93.3%, and boosts the maximum generation throughput to 5.76 times. We also evaluate DeepSeek-V2 Chat (SFT) and DeepSeek-V2 Chat (RL) on open-ended benchmarks. Notably, DeepSeek-V2 Chat (RL) achieves 38.9 length-controlled win rate on AlpacaEval 2.0 (Dubois et al., 2024), 8.97 overall score on MT-Bench (Zheng et al., 2023), and 7.91 overall score on AlignBench (Liu et al., 2023). The English open-ended conversation evaluations demonstrate that DeepSeek-V2 Chat (RL) has toptier performance among open-source chat models. In addition, the evaluation on AlignBench indicates that in Chinese, DeepSeek-V2 Chat (RL) outperforms all of open-source models, and even beats most of closed-source models.

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
      Figure 2 | Illustration of the architecture of DeepSeek-V2. MLA ensures efficient inference by significantly reducing the KV cache for generation, and DeepSeekMoE enables training strong models at an economical cost through the sparse architecture.

[ 82] T `body          ` p5 · 10.9pt · 7 lines · (continuation of a paragraph from the previous page)
      DeepSeek-V2 Chat (RL) on open-ended benchmarks. Notably, DeepSeek-V2 Chat (RL) achieves 38.9 length-controlled win rate on AlpacaEval 2.0 (Dubois et al., 2024), 8.97 overall score on MT-Bench (Zheng et al., 2023), and 7.91 overall score on AlignBench (Liu et al., 2023). The English open-ended conversation evaluations demonstrate that DeepSeek-V2 Chat (RL) has toptier performance among open-source chat models. In addition, the evaluation on AlignBench indicates that in Chinese, DeepSeek-V2 Chat (RL) outperforms all of open-source models, and even beats most of closed-source models.

[ 83] T `body          ` p5 · 10.9pt · 4 lines
      In order to facilitate further research and development on MLA and DeepSeekMoE, we also release DeepSeek-V2-Lite, a smaller model equipped with MLA and DeepSeekMoE, for the open-source community. It has a total of 15.7B parameters, where 2.4B are activated for each token. Detailed descriptions about DeepSeek-V2-Lite can be found in Appendix B.

[ 84] T `body          ` p5 · 10.9pt · 5 lines
      In the rest of this paper, we first provide a detailed description of the model architecture of DeepSeek-V2 (Section 2). Subsequently, we introduce our pre-training endeavors, including the training data construction, hyper-parameter settings, infrastructures, long context extension, and the evaluation of model performance and efficiency (Section 3). Following this, we demonstrate our efforts in alignment, encompassing Supervised Fine-Tuning (SFT), Reinforcement

## Page 6

[ 85] T `body          ` p6 · 10.9pt · 3 lines
      Learning (RL), the evaluation results, and other discussion (Section 4). Finally, we summarize the conclusion, deliberate on the current limitations of DeepSeek-V2, and outline our future work (Section 5).

[ 86] T `heading       ` p6 · 13pt · 1 lines
      2. Architecture

[ 87] T `body          ` p6 · 10.9pt · 11 lines
      By and large, DeepSeek-V2 is still in the Transformer architecture (Vaswani et al., 2017), where each Transformer block consists of an attention module and a Feed-Forward Network (FFN). However, for both the attention module and the FFN, we design and employ innovative architectures. For attention, we design MLA, which utilizes low-rank key-value joint compression to eliminate the bottleneck of inference-time key-value cache, thus supporting efficient inference. For FFNs, we adopt the DeepSeekMoE architecture (Dai et al., 2024), a high-performance MoE architecture that enables training strong models at an economical cost. An illustration of the architecture of DeepSeek-V2 is presented in Figure 2, and we will introduce the details of MLA and DeepSeekMoE in this section. For other tiny details (e.g., layer normalization and the activation function in FFNs), unless specifically stated, DeepSeek-V2 follows the settings of DeepSeek 67B (DeepSeek-AI, 2024).

[ 88] T `body          ` p6 · 10.9pt · 7 lines
      2.1. Multi-Head Latent Attention: Boosting Inference Efficiency Conventional Transformer models usually adopts Multi-Head Attention (MHA) (Vaswani et al., 2017), but during generation, its heavy Key-Value (KV) cache will become the bottleneck that limit the inference efficiency. In order to reduce the KV cache, Multi-Query Attention (MQA) (Shazeer, 2019) and Grouped-Query Attention (GQA) (Ainslie et al., 2023) are proposed. They require a smaller magnitude of KV cache, but their performance does not match MHA (we provide the ablation of MHA, GQA and MQA in Appendix D.1).

[ 89] T `body          ` p6 · 10.9pt · 4 lines
      For DeepSeek-V2, we design an innovative attention mechanism called Multi-head Latent Attention (MLA). Equipped with low-rank key-value joint compression, MLA achieves better performance than MHA, but requires a significantly smaller amount of KV cache. We introduce its architecture in the following, and also provide a comparison between MLA and MHA in

[ 90] T `body          ` p6 · 10.9pt · 1 lines
      Appendix D.2.

[ 91] T `body          ` p6 · 10.9pt · 5 lines
      2.1.1. Preliminaries: Standard Multi-Head Attention We first introduce the standard MHA mechanism as background. Let 𝑑 be the embedding dimension, 𝑛ℎ be the number of attention heads, 𝑑ℎ be the dimension per head, and h𝑡 ∈ R𝑑 be the attention input of the 𝑡-th token at an attention layer. Standard MHA first produces q𝑡 , k𝑡 , v𝑡 ∈ R𝑑ℎ 𝑛ℎ through three matrices 𝑊𝑄 , 𝑊 𝐾 , 𝑊𝑉 ∈ R𝑑ℎ 𝑛ℎ ×𝑑 , respectively:

## Page 7 (two columns)

[ 92] · `figure-data   ` p7 · 7.4pt · 1 lines
      Multi-Head Attention (MHA) Grouped-Query Attention (GQA) Multi-Query Attention (MQA) Multi-Head Latent Attention (MLA)

[ 93] · `figure-data   ` p7 · 6.9pt · 1 lines
      Cached During Inference

[ 94] · `figure-data   ` p7 · 6.9pt · 1 lines
      Values

[ 95] · `figure-data   ` p7 · 6.9pt · 1 lines
      Keys

[ 96] · `figure-data   ` p7 · 6.9pt · 1 lines
      Queries

[ 97] T `figure-caption` p7 · 10.9pt · 4 lines
      Figure 3 | Simplified illustration of Multi-Head Attention (MHA), Grouped-Query Attention (GQA), Multi-Query Attention (MQA), and Multi-head Latent Attention (MLA). Through jointly compressing the keys and values into a latent vector, MLA significantly reduces the KV cache during inference.

[ 98] · `figure-data   ` p7 · 6.1pt · 1 lines
      projection

[ 99] · `figure-data   ` p7 · 6.9pt · 2 lines
      Compressed Latent KV

[100] T `body          ` p7 · 10.9pt · 1 lines
      Then, q𝑡 , k𝑡 , v𝑡 will be sliced into 𝑛ℎ heads for the multi-head attention computation:

[101] T `body          ` p7 · 10.9pt · 5 lines
      where q𝑡,𝑖, k𝑡,𝑖, v𝑡,𝑖 ∈ R𝑑ℎ denote the query, key, and value of the 𝑖-th attention head, respectively; 𝑊𝑂 ∈ R𝑑×𝑑ℎ 𝑛ℎ denotes the output projection matrix. During inference, all keys and values need to be cached to accelerate inference, so MHA needs to cache 2𝑛ℎ𝑑ℎ𝑙 elements for each token. In model deployment, this heavy KV cache is a large bottleneck that limits the maximum batch size and sequence length.

[102] T `body          ` p7 · 10.9pt · 2 lines
      2.1.2. Low-Rank Key-Value Joint Compression The core of MLA is the low-rank joint compression for keys and values to reduce KV cache:

[103] T `body          ` p7 · 10.9pt · 7 lines
      where c𝑡𝐾𝑉 ∈ R𝑑𝑐 is the compressed latent vector for keys and values; 𝑑𝑐 (≪ 𝑑ℎ𝑛ℎ) denotes the KV compression dimension; 𝑊 𝐷𝐾𝑉 ∈ R𝑑𝑐 ×𝑑 is the down-projection matrix; and 𝑊𝑈 𝐾 , 𝑊𝑈𝑉 ∈ R𝑑ℎ 𝑛ℎ ×𝑑𝑐 are the up-projection matrices for keys and values, respectively. During inference, MLA only needs to cache c𝑡𝐾𝑉 , so its KV cache has only 𝑑𝑐 𝑙 elements, where 𝑙 denotes the number of layers. In addition, during inference, since 𝑊𝑈 𝐾 can be absorbed into 𝑊𝑄 , and 𝑊𝑈𝑉 can be absorbed into 𝑊𝑂, we even do not need to compute keys and values out for attention. Figure 3 intuitively illustrates how the KV joint compression in MLA reduces the KV cache.

[104] T `body          ` p7 · 10.9pt · 1 lines · continues on the next page
      Moreover, in order to reduce the activation memory during training, we also perform low-rank compression for the queries, even if it cannot reduce the KV cache:

## Page 8 (two columns)

[105] T `body          ` p8 · 10.9pt · 1 lines · (continuation of a paragraph from the previous page)
      low-rank compression for the queries, even if it cannot reduce the KV cache:

[106] T `body          ` p8 · 10.9pt · 3 lines
      where c𝑡𝑄 ∈ R𝑑𝑐′ is the compressed latent vector for queries; 𝑑𝑐′ (≪ 𝑑ℎ𝑛ℎ) denotes the query compression dimension; and 𝑊 𝐷𝑄 ∈ R𝑑𝑐 ×𝑑 , 𝑊𝑈𝑄 ∈ R𝑑ℎ 𝑛ℎ ×𝑑𝑐 are the down-projection and upprojection matrices for queries, respectively.

[107] T `body          ` p8 · 10.9pt · 5 lines
      2.1.3. Decoupled Rotary Position Embedding Following DeepSeek 67B (DeepSeek-AI, 2024), we intend to use the Rotary Position Embedding (RoPE) (Su et al., 2024) for DeepSeek-V2. However, RoPE is incompatible with low-rank KV compression. To be specific, RoPE is position-sensitive for both keys and queries. If we apply RoPE for the keys k𝐶, 𝑊𝑈 𝐾 in Equation 10 will be coupled with a position-sensitive RoPE matrix.

[108] T `body          ` p8 · 10.9pt · 4 lines
      In this way, 𝑊𝑈 𝐾 cannot be absorbed into 𝑊𝑄 any more during inference, since a RoPE matrix related to the currently generating token will lie between 𝑊𝑄 and 𝑊𝑈 𝐾 and matrix multiplication does not obey a commutative law. As a result, we must recompute the keys for all the prefix tokens during inference, which will significantly hinder the inference efficiency.

[109] T `body          ` p8 · 10.9pt · 4 lines
      As a solution, we propose the decoupled RoPE strategy that uses additional multi-head queries q ∈ R ℎ and a shared key k ∈ R ℎ to carry RoPE, where 𝑑 denotes the per-head dimension of the decoupled queries and key. Equipped with the decoupled RoPE strategy, MLA performs the following computation:

[110] T `body          ` p8 · 10.9pt · 4 lines
      where 𝑊𝑄𝑅 ∈ R𝑑ℎ 𝑛ℎ ×𝑑𝑐 and 𝑊 𝐾𝑅 ∈ R𝑑ℎ ×𝑑 are matrices to produce the decouples queries and key, respectively; RoPE(·) denotes the operation that applies RoPE matrices; and [·; ·] denotes the concatenation operation. During inference, the decoupled key should also be cached. Therefore, DeepSeek-V2 requires a total KV cache containing (𝑑𝑐 + 𝑑ℎ𝑅 )𝑙 elements.

[111] T `body          ` p8 · 10.9pt · 2 lines
      In order to demonstrate the complete computation process of MLA, we also organize and provide its full formulas in Appendix C.

[112] T `body          ` p8 · 10.9pt · 4 lines
      2.1.4. Comparison of Key-Value Cache We demonstrate a comparison of the KV cache per token among different attention mechanisms in Table 1. MLA requires only a small amount of KV cache, equal to GQA with only 2.25 groups, but can achieve stronger performance than MHA.
