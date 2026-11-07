# Segmentation dump: Xiao 等 - Deterministic Image-to-Image Translation via Denoising Brownian Bridge Models with Dual Approximator.pdf

- pages: 8 / 10
- paragraphs (canonical): 91
- page-break joins: 4
- translatable: 73
- body font size: 10
- extract time: 76 ms
- font tiers: body=10 h1=14.4 h2=12

Legend: `T` = translated, `·` = skipped. Roles: title/author/heading/abstract/body/
figure-caption/table-caption/keywords are translated; table/formula/toc/
figure-data/pageNoise/footnote/meta are not.

## Page 1 (two columns)

[  1] T `body          ` p1 · 9.4pt · 1 lines
      This CVPR paper is the Open Access version, provided by the Computer Vision Foundation.

[  2] T `body          ` p1 · 9.4pt · 2 lines
      Except for this watermark, it is identical to the accepted version; the final published version of the proceedings is av…

[  3] T `body          ` p1 · 14.4pt · 2 lines
      Deterministic Image-to-Image Translation via Denoising Brownian Bridge Models with Dual Approximators

[  4] T `body          ` p1 · 12pt · 3 lines
      Bohan Xiao1*, Peiyong Wang2*, Qisheng He1, Ming Dong1 Department of Computer Science, Wayne State University 1, Detroit,…

[  5] · `figure-data   ` p1 · 9pt · 1 lines
      {gk6511, pywang, qisheng.he, mdong}@wayne.edu

[  6] T `heading       ` p1 · 12pt · 1 lines
      Abstract

[  7] T `abstract      ` p1 · 10pt · 26 lines
      Image-to-Image (I2I) translation involves converting an image from one domain to another. Deterministic I2I translation,…

[  8] T `heading       ` p1 · 12pt · 1 lines
      1. Introduction

[  9] T `body          ` p1 · 10pt · 16 lines
      Among the wide range of applications, some I2I tasks particularly benefit from deterministic models. For instance, in su…

[ 10] · `figure-data   ` p1 · 8pt · 1 lines
      *Both authors contributed equally to this research.

[ 11] T `body          ` p1 · 10pt · 8 lines
      Generative Adversarial Networks (GANs) [16] have been instrumental in advancing I2I translation, with models like Pix2Pi…

[ 12] T `body          ` p1 · 10pt · 21 lines
      Diffusion models, such as Denoising Diffusion Probabilistic Models (DDPM) [19] and Latent Diffusion Models (LDM) [40], g…

## Page 2 (two columns)

[ 13] · `figure-data   ` p2 · 9pt · 7 lines
      Figure 1. Sampling comparison between SDE-based sampler, PF-ODE-based sampler, and Dual-approx Bridge. The circular area…

[ 14] T `body          ` p2 · 10pt · 3 lines
      Therefore, there is a growing need for deterministic models that can preserve both image quality and faithfulness in I2I…

[ 15] T `body          ` p2 · 10pt · 20 lines
      To resolve this dilemma in the pursuit of deterministic sampling with both high image quality and fidelity, in this pape…

[ 16] T `body          ` p2 · 10pt · 7 lines
      • To our best knowledge, Dual-approx Bridge is the first generative model that exploits the Brownian bridge structure to…

[ 17] T `body          ` p2 · 10pt · 6 lines
      • In Dual-approx Bridge, the reverse approximator optimizes the reverse denoising process and presents an optimal determ…

[ 18] T `body          ` p2 · 10pt · 6 lines
      • Through extensive experiments on benchmark datasets including image generation and super-resolution, we demonstrate th…

[ 19] T `heading       ` p2 · 12pt · 1 lines
      2. Related Work

[ 20] T `body          ` p2 · 10pt · 3 lines
      In this section, we briefly review the related literature, including image-to-image translation, GAN Models, Diffusion M…

[ 21] · `figure-data   ` p2 · 11pt · 1 lines
      2.1. Image-to-Image Translation

[ 22] T `body          ` p2 · 10pt · 16 lines
      Image-to-image (I2I) translation has become a core task in computer vision [1, 21, 36], focused on learning mappings bet…

[ 23] T `heading       ` p2 · 11pt · 1 lines
      2.2. Brown Bridge

[ 24] T `body          ` p2 · 10pt · 9 lines
      The Brownian Bridge (BB) [32, 47] is a fundamental stochastic process that models a constrained Brownian motion, where t…

[ 25] T `heading       ` p2 · 11pt · 1 lines
      2.3. Generative Adversarial Networks

[ 26] T `body          ` p2 · 10pt · 7 lines · continues on the next page
      GANs [16] have been pivotal in advancing I2I translation by learning mappings between image domains through adversarial…

## Page 3 (two columns)

[ 27] T `figure-caption` p3 · 9pt · 1 lines
      Figure 2. Training process of the two approximators (top-left: forward diffusive process, bottom-left: reverse diffusive…

[ 28] · `figure-data   ` p3 · 9pt · 1 lines
      Sampling workflow with both approximators in action.

[ 29] T `body          ` p3 · 10pt · 6 lines · (continuation of a paragraph from the previous page)
      model to translate images across domains without requiring paired samples. However, GANs often face artifacts in generat…

[ 30] T `heading       ` p3 · 11pt · 1 lines
      2.4. Diffusion and Bridge Models

[ 31] T `body          ` p3 · 10pt · 11 lines
      Diffusion models have established themselves as a leading approach in generative modeling [11] due to their ability to p…

[ 32] T `body          ` p3 · 10pt · 13 lines
      To model the denoising process, diffusion models can rely on two distinct mathematical frameworks: SDEs and PF-ODEs [43]…

[ 33] T `body          ` p3 · 10pt · 11 lines
      Bridge models [25, 29, 54] integrate principles from both diffusion and bridge frameworks to create a probabilistic conn…

[ 34] T `heading       ` p3 · 12pt · 1 lines
      3. Deterministic Dual-approx Bridge

[ 35] T `body          ` p3 · 10pt · 15 lines
      In this section, we present Dual-approx Bridge in details. The Brownian bridge models [32, 47] have achieved high image…

[ 36] · `figure-data   ` p3 · 11pt · 1 lines
      3.1. Score-Based SDE

[ 37] T `body          ` p3 · 10pt · 4 lines
      The score-based Brownian bridge model is prescribed by the forward and reverse SDEs. The forward SDE reads where W (·) i…

## Page 4 (two columns)

[ 38] · `figure-data   ` p4 · 10pt · 1 lines
      Z t

[ 39] · `figure-data   ` p4 · 10pt · 2 lines
      g(s) dW (s)

[ 40] · `table         ` p4 · 10pt · 3 lines
      That is Xt = (1 − t)X0 + tY + G(t)ϵ, ϵ ∼ N (0, I). (3) The reverse generative SDE [2] is given by

[ 41] T `body          ` p4 · 10pt · 19 lines
      where W (·) is a reverse time Brownian motion, and the score function is given by G(t) Hence, in the reverse transitiona…

[ 42] T `body          ` p4 · 10pt · 3 lines
      3.2. Training of Neural Network Approximators For simplicity, we take the variance of the white noise g(t) = 1. Then G(t…

[ 43] T `body          ` p4 · 10pt · 10 lines
      Forward Training Objective: We design a neural network ϵθ to minimize, for t = 1, . . . , T , ϵ ∼ N (0, I), Here Xt is d…

[ 44] T `body          ` p4 · 10pt · 7 lines
      Reverse Training Objective: Independently of the forward training, we design a neural network Zϕ(Xt, t) to minimize, for…

[ 45] T `heading       ` p4 · 11pt · 1 lines
      3.3. Sampling

[ 46] T `body          ` p4 · 10pt · 3 lines
      We employ the two neural networks in this way: X0 ≈ Xt − ϵθ (Xt, t), while W (t) − W (t − ∆t) must be approximated with…

[ 47] T `body          ` p4 · 10pt · 8 lines · continues on the next page
      We make an observation here: W (t) − W (t − ∆t) and W (t + ∆t) − W (t) are independent, equivalent random variables. Let…

[ 48] · `figure-data   ` p4 · 7pt · 1 lines
      R t dW

[ 49] · `figure-data   ` p4 · 10pt · 2 lines
      where Z t dW

## Page 5 (two columns)

[ 50] T `body          ` p5 · 10pt · 12 lines · (continuation of a paragraph from the previous page)
      Algorithm 1 Forward Approximator Training Algorithm 1: Input Paired Dataset Dx,y , Forward Network ϵθ , Total Time Steps…

[ 51] · `figure-data   ` p5 · 10pt · 1 lines
      Finally, we define

[ 52] T `body          ` p5 · 10pt · 6 lines
      The only randomness introduced in the entire sampling process is in XT −1, which should be negligible, as the coefficien…

[ 53] T `heading       ` p5 · 11pt · 1 lines
      3.4. Algorithm

[ 54] T `body          ` p5 · 10pt · 4 lines
      In a given paired dataset Dx,y , (x, y)  denotes a paired im-  p ages from the set. Define B(t) = G and we have the tra…

[ 55] T `body          ` p5 · 10pt · 6 lines
      Algorithm 3 Sampling Algorithm (Refactored) Input: y, ϵθ , Zϕ Output: x0 1: xt = y In this section, we verify the capabi…

[ 56] T `heading       ` p5 · 12pt · 1 lines
      4. Experiments

[ 57] T `body          ` p5 · 10pt · 5 lines
      • How do varying the number of sampling steps impact its performance in terms of image quality and faithfulness to GT? F…

[ 58] T `body          ` p5 · 10pt · 4 lines
      • How does Dual-approx Bridge perform in terms of faithfulness to GT compared to other models in image-toimage translati…

[ 59] T `body          ` p5 · 10pt · 4 lines
      • How does Dual-approx Bridge perform in general imageto-image translation tasks, which prioritize image quality, when c…

[ 60] T `body          ` p5 · 10pt · 13 lines
      To address these questions, we used datasets with the following resolutions: Cityscapes [10] (256×256), Edges2Handbags […

## Page 6 (two columns)

[ 61] T `table-caption ` p6 · 9pt · 4 lines
      Table 1. Quantitative comparison with different sampling steps on the Cityscapes dataset. Bold values represent the best…

[ 62] T `heading       ` p6 · 11pt · 1 lines
      4.1. Ablation Study

[ 63] T `body          ` p6 · 10pt · 18 lines
      4.1.1. Impact of Sampling Steps We first evaluate the impact of sampling steps on our model’s performance in the label-t…

[ 64] T `body          ` p6 · 10pt · 14 lines
      Additionally, we assessed the variance of the output fidelity in five independent sampling trials given the same input.…

[ 65] T `body          ` p6 · 10pt · 9 lines
      4.1.2. Faithfulness Evaluation We then compare the faithfulness of Dual-approx Bridge to other Brownian bridge models wi…

[ 66] T `table-caption ` p6 · 9pt · 4 lines
      Table 2. Quantitative comparison with Brownian bridges using SDE and PF-ODE-based samplers on Cityscape. Bold values rep…

[ 67] T `figure-caption` p6 · 9pt · 6 lines
      Figure 3. Qualitative comparison with Brownian bridges using SDE-based and PF-ODE-based samplers on Edges2Handbags. Thre…

[ 68] T `body          ` p6 · 10pt · 9 lines
      outperforms SDE-based and PF-ODE-based samplers. The PSNR value increased by approximately 12% compared to the second-be…

[ 69] T `body          ` p6 · 10pt · 7 lines
      Figure 3 shows three sample images by each model with the same input in the Edges2Handbags dataset. The images generated…

[ 70] T `body          ` p6 · 10pt · 7 lines · continues on the next page
      4.2. Deterministic Image-to-Image Translation We selected the label-to-photo task in the Cityscapes dataset for determin…

## Page 7 (two columns)

[ 71] T `table-caption ` p7 · 9pt · 3 lines
      Table 3. Quantitative comparison with deterministic models on Cityscape. Results of our model are obtained using 200 sam…

[ 72] T `figure-caption` p7 · 9pt · 2 lines
      Figure 4. Qualitative comparison between Dual-approx Bridge and SOTA methods on the Cityscapes dataset.

[ 73] T `figure-caption` p7 · 9pt · 1 lines
      Figure 5. Qualitative comparison on BSD100 datasets.

[ 74] T `body          ` p7 · 10pt · 3 lines · (continuation of a paragraph from the previous page)
      cluded image super-resolution as a deterministic image-toimage translation task, which also requires both high quality a…

[ 75] T `body          ` p7 · 10pt · 17 lines
      Given the inherent randomness in diffusion models, we primarily chose GAN-based models as baselines for deterministic I2…

[ 76] T `figure-caption` p7 · 9pt · 1 lines
      Figure 6. Qualitative comparison on Uban100 datasets.

[ 77] · `figure-data   ` p7 · 8.2pt · 1 lines
      BSD100 Urban100

[ 78] · `figure-data   ` p7 · 8.2pt · 1 lines
      Model

[ 79] · `figure-data   ` p7 · 8.2pt · 1 lines
      LPIPS ↓ PSNR ↑ LPIPS ↓ PSNR ↑

[ 80] T `table-caption ` p7 · 9pt · 2 lines
      Table 4. Quantitative comparisons on BSD100 and Urban100. Bold values represent the best performance.

[ 81] T `body          ` p7 · 10pt · 3 lines
      improved by approximately 50% (from 35.41% to 53.26%). Qualitative comparisons of various methods are presented in Figur…

[ 82] T `body          ` p7 · 10pt · 12 lines
      Table 4 compares our model against baselines on superresolution tasks. Our model performed the best on the BSD100 datase…

[ 83] T `body          ` p7 · 10pt · 7 lines · continues on the next page
      Figure 5 compares the visual quality of various methods for image super-resolution. The top-right of each image shows a…

## Page 8 (two columns)

[ 84] T `figure-caption` p8 · 9pt · 1 lines
      Figure 7. Qualitative comparison between Dual-approx Bridge and SOTA methods on the Edges2handbags dataset.

[ 85] · `table         ` p8 · 9.5pt · 11 lines
      Method FID ↓ MUNIT 91.4 DRIT 155.3 Distance 85.8 SelfDistance 78.8 CGGAN 105.2 CUT 56.4 FastCUT 68.8 DCLGAN 49.4 SimDCL…

[ 86] T `table-caption ` p8 · 9pt · 2 lines
      Table 5. Quantitative comparison of image quality on Cityscapes (label to photo). Bold values represent the best perform…

[ 87] T `figure-caption` p8 · 9pt · 5 lines
      Figure 8. Quantitative comparison between Dual-approx Bridge and A-bridge (with SDE-based sampler). Each model are sampl…

[ 88] T `body          ` p8 · 10pt · 6 lines · (continuation of a paragraph from the previous page)
      regions for both examples. Figure 6 further illustrates that our model can achieve detail preservation approaching or ev…

[ 89] · `figure-data   ` p8 · 11pt · 1 lines
      4.3. General Image-to-Image Translation

[ 90] T `body          ` p8 · 10pt · 6 lines
      Finally, we evaluate Dual-approx Bridge on general imageto-image translation tasks. We assess our model’s image quality…

[ 91] · `table         ` p8 · 9.5pt · 6 lines
      Method FID ↓ Pix2Pix 74.8 DDIB 186.84 SDEdit 85.8 SelfDistance 26.5 Rectified Flow 25.3

[ 92] T `table-caption ` p8 · 10pt · 6 lines
      Table 6. Quantitative comparison of image quality on Edges2Handbags. Bold values represent the best performance. Citysca…

[ 93] T `body          ` p8 · 10pt · 14 lines
      On the Cityscapes dataset, our model outperforms all GAN-based models, achieving the top position and surpassing all com…

[ 94] T `heading       ` p8 · 12pt · 1 lines
      5. Conclusion and Future Work

[ 95] T `body          ` p8 · 10pt · 10 lines
      In this paper, we proposed Dual-approx Bridge, a novel generative model to produce faithful and high quality output for…
