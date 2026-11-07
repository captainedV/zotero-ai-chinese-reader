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
      Except for this watermark, it is identical to the accepted version; the final published version of the proceedings is available on IEEE Xplore.

[  3] T `body          ` p1 · 14.4pt · 2 lines
      Deterministic Image-to-Image Translation via Denoising Brownian Bridge Models with Dual Approximators

[  4] T `body          ` p1 · 12pt · 3 lines
      Bohan Xiao1*, Peiyong Wang2*, Qisheng He1, Ming Dong1 Department of Computer Science, Wayne State University 1, Detroit, Michigan, USA Department of Mathematics, Wayne State University2, Detroit, Michigan, USA

[  5] · `figure-data   ` p1 · 9pt · 1 lines
      {gk6511, pywang, qisheng.he, mdong}@wayne.edu

[  6] T `heading       ` p1 · 12pt · 1 lines
      Abstract

[  7] T `abstract      ` p1 · 10pt · 26 lines
      Image-to-Image (I2I) translation involves converting an image from one domain to another. Deterministic I2I translation, such as in image super-resolution, extends this concept by guaranteeing that each input generates a consistent and predictable output, closely matching the ground truth (GT) with high fidelity. In this paper, we propose a denoising Brownian bridge model with dual approximators (Dualapprox Bridge), a novel generative model that exploits the Brownian bridge dynamics and two neural network-based approximators (one for forward and one for reverse process) to produce faithful output with negligible variance and high image quality in I2I translations. Our extensive experiments on benchmark datasets including image generation and super-resolution demonstrate the consistent and superior performance of Dual-approx Bridge in terms of image quality and faithfulness to GT when compared to both stochastic and deterministic baselines. Project page and code: https://github.com/bohan95/dual-app-bridge Image-to-Image (I2I) translation is a significant area of research with broad applications across academia and industry. It involves transforming an image from one domain to another while preserving essential features. Key tasks in this field include generating realistic images from semantic labels [24, 40, 42, 57], transforming segmentation masks into photo-like outputs [40, 47, 54], and enhancing image quality through super-resolution [8, 27, 52].

[  8] T `heading       ` p1 · 12pt · 1 lines
      1. Introduction

[  9] T `body          ` p1 · 10pt · 16 lines
      Among the wide range of applications, some I2I tasks particularly benefit from deterministic models. For instance, in super-resolution, the goal is to translate a lowresolution image into a high-resolution one while accurately preserving fine details. This task, as shown in recent studies [13, 14], requires consistency and high faithfulness to ground true (GT) because for a given low-resolution image, there is typically one “correct” high-resolution output that should be produced. In such an I2I task, we note that faithfulness or fidelity is to the individual GT, not just to the distribution of GT. Any variability in the generated output could result in artifacts or loss of critical information, making stochastic approaches less desirable. Similarly, in tasks such as denoising [6, 51] or inpainting [4, 39], where missing or noisy parts of an image need to be restored, a deterministic approach is preferred.

[ 10] · `figure-data   ` p1 · 8pt · 1 lines
      *Both authors contributed equally to this research.

[ 11] T `body          ` p1 · 10pt · 8 lines
      Generative Adversarial Networks (GANs) [16] have been instrumental in advancing I2I translation, with models like Pix2Pix [24] and CycleGAN[57] demonstrating impressive results. GANs are deterministic during inference, producing the same output for a given input, which is advantageous for tasks requiring faithfulness. However, GANs often struggle to generate high-quality images, frequently resulting in blurriness and artifacts [1, 21].

[ 12] T `body          ` p1 · 10pt · 21 lines
      Diffusion models, such as Denoising Diffusion Probabilistic Models (DDPM) [19] and Latent Diffusion Models (LDM) [40], generate high-quality images by progressively adding noise to images and learning the reverse process. Bridge models, such as Brownian bridge diffusion models [32, 47], utilize Stochastic Differential Equations (SDEs) to directly interpolate between input and output distributions, allowing precise control over transformations [40, 42]. This approach improves analytical tractability, making bridge models well suited for I2I translations. However, the inherent stochasticity in these models (see Figure 1(a)) complicates tasks where faithful results are required (e.g., image super-resolution and image reconstruction). Unlike traditional diffusion models [19, 40, 43], which start from noise and gradually denoise the input to generate an output, bridge models start from structured data and interpolate between input and output distributions. This difference means that deterministic methods like Probability Flow Ordinary Differential Equations (PF-ODEs) [43], when applied to bridge models, can lead to blurry images [43, 54], resulting in degraded model performance (see Figure 1(b)).

## Page 2 (two columns)

[ 13] · `figure-data   ` p2 · 9pt · 7 lines
      Figure 1. Sampling comparison between SDE-based sampler, PF-ODE-based sampler, and Dual-approx Bridge. The circular area within the dashed circle indicates where the SDE-based sampling outputs land. (a) SDE-based Sampling: diverse outputs of high image quality. (b) PF-ODE-based Sampling: deterministic outputs lack of fine details of ground truth (GT). (c) Dual-approx Bridge Sampling: deterministic output with fine details of GT.

[ 14] T `body          ` p2 · 10pt · 3 lines
      Therefore, there is a growing need for deterministic models that can preserve both image quality and faithfulness in I2I translations.

[ 15] T `body          ` p2 · 10pt · 20 lines
      To resolve this dilemma in the pursuit of deterministic sampling with both high image quality and fidelity, in this paper we propose a denoising Brownian bridge model with Dual Approximators (abbreviated as “Dual-approx Bridge”), a generative model that exploits the Brownian bridge structure to produce faithful output with negligible variance and with an image quality better than or comparable to that generated by SDE-based samplers. More specifically, in the SDE-based structure of a Brownian bridge with both forward and corresponding reverse Brownian motions, we train a neural network in the forward diffusive process to estimate the score function and the initial state in the diffusive iteration. Meanwhile, in the reverse process of the Brownian bridge, a second neural network is trained to approximate the white noise scaled to the time step increment. Here, we emphasize that in deterministic I2I, our goal is to generate a unique output from a given input, rather than translating probability distributions, as shown in Figure 1(c). The major contributions of this work are as follows:

[ 16] T `body          ` p2 · 10pt · 7 lines
      • To our best knowledge, Dual-approx Bridge is the first generative model that exploits the Brownian bridge structure to produce faithful output with negligible variance and high image quality for deterministic I2I translations. This is achieved through a novel design of a pair of approximators, trained in the forward and reverse diffusive processes, respectively.

[ 17] T `body          ` p2 · 10pt · 6 lines
      • In Dual-approx Bridge, the reverse approximator optimizes the reverse denoising process and presents an optimal deterministic route for the generative process. From a theoretical perspective, we analyze our model in a general setting where the white noise may take any timedependent variance.

[ 18] T `body          ` p2 · 10pt · 6 lines
      • Through extensive experiments on benchmark datasets including image generation and super-resolution, we demonstrate the consistent and superior performance of Dual-approx Bridge on image quality and faithfulness to GT when compared to state-of-the-art (SOTA) GANbased and diffusion-based I2I models.

[ 19] T `heading       ` p2 · 12pt · 1 lines
      2. Related Work

[ 20] T `body          ` p2 · 10pt · 3 lines
      In this section, we briefly review the related literature, including image-to-image translation, GAN Models, Diffusion Models, and Bridge Models.

[ 21] · `figure-data   ` p2 · 11pt · 1 lines
      2.1. Image-to-Image Translation

[ 22] T `body          ` p2 · 10pt · 16 lines
      Image-to-image (I2I) translation has become a core task in computer vision [1, 21, 36], focused on learning mappings between the source and target image domains for applications such as style transfer [15] and colorization [9]. Traditional methods, including Pix2Pix [24] and CycleGAN[57], utilize GAN-based architectures to translate images and support diverse I2I tasks by capturing domain-specific features, though challenges remain in maintaining high quality across complex domains [5, 41]. Deterministic I2I translation builds on this by ensuring that each input produces a consistent, predictable output — an essential requirement in fields like medical imaging [28], where precision and reproducibility are crucial. In tasks such as super-resolution [12] or denoising [46], deterministic models can enhance image resolution and clarity without introducing variations that could adversely affect analysis or interpretation.

[ 23] T `heading       ` p2 · 11pt · 1 lines
      2.2. Brown Bridge

[ 24] T `body          ` p2 · 10pt · 9 lines
      The Brownian Bridge (BB) [32, 47] is a fundamental stochastic process that models a constrained Brownian motion, where the trajectory is conditioned on fixed start and end points. Unlike an unconstrained Wiener process, which evolves freely, a Brownian bridge interpolates between two known states while maintaining stochastic variations. This property makes it particularly useful in probabilistic modeling, including image-to-image (I2I) translation, conditional generative modeling, and stochastic optimal transport.

[ 25] T `heading       ` p2 · 11pt · 1 lines
      2.3. Generative Adversarial Networks

[ 26] T `body          ` p2 · 10pt · 7 lines · continues on the next page
      GANs [16] have been pivotal in advancing I2I translation by learning mappings between image domains through adversarial training. One foundational model, Pix2Pix [24], introduced a conditional GAN approach for paired I2I tasks, enabling applications like colorization[7] and semantic label-to-photo translation[24]. For unpaired I2I tasks, CycleGAN [57] employs cycle consistency, allowing the model to translate images across domains without requiring paired samples. However, GANs often face artifacts in generated images [5, 41, 50]. Such limitations in image quality, combined with the common challenges of training instability, make GANs less suitable for applications demanding both quality and faithfulness.

## Page 3 (two columns)

[ 27] T `figure-caption` p3 · 9pt · 1 lines
      Figure 2. Training process of the two approximators (top-left: forward diffusive process, bottom-left: reverse diffusive process). Right:

[ 28] · `figure-data   ` p3 · 9pt · 1 lines
      Sampling workflow with both approximators in action.

[ 29] T `body          ` p3 · 10pt · 6 lines · (continuation of a paragraph from the previous page)
      model to translate images across domains without requiring paired samples. However, GANs often face artifacts in generated images [5, 41, 50]. Such limitations in image quality, combined with the common challenges of training instability, make GANs less suitable for applications demanding both quality and faithfulness.

[ 30] T `heading       ` p3 · 11pt · 1 lines
      2.4. Diffusion and Bridge Models

[ 31] T `body          ` p3 · 10pt · 11 lines
      Diffusion models have established themselves as a leading approach in generative modeling [11] due to their ability to produce high-quality, realistic images through a gradual denoising process. DDPM [20] pioneered this approach, modeling image generation as a series of iterative steps in which random noise is gradually refined into a structured target image. The process results in exceptionally high-quality images with reduced artifacts, often surpassing GANs. LDMs [40] further refined DDPM by focusing on a latent space rather than a pixel space, making the generation process more efficient.

[ 32] T `body          ` p3 · 10pt · 13 lines
      To model the denoising process, diffusion models can rely on two distinct mathematical frameworks: SDEs and PF-ODEs [43]. SDEs, characterized by their inherent randomness, allow the model to generate diverse outputs by gradually reversing noise, enhancing detail and realism, but lacking consistency. This randomness can lead to the same input producing varying outputs. PF-ODEs, on the other hand, remove this randomness, providing a deterministic pathway that produces consistent outputs at the expense of fine details and image richness [32, 43]. Balancing the high image quality provided by SDEs with the consistency achieved by PF-ODEs remains a core challenge in diffusion models.

[ 33] T `body          ` p3 · 10pt · 11 lines
      Bridge models [25, 29, 54] integrate principles from both diffusion and bridge frameworks to create a probabilistic connection between input and output distributions. Both the Schr¨odinger and Brownian Bridge frameworks [47, 54] have demonstrated significant improvements in image quality across various I2I tasks when compared to traditional diffusion models. However, they inherit certain limitations from both SDE-based and PF-ODE-based sampling. Specifically, they retain the stochastic characteristics of SDEs while also experiencing the lower image quality associated with PF-ODE-based samplers [54].

[ 34] T `heading       ` p3 · 12pt · 1 lines
      3. Deterministic Dual-approx Bridge

[ 35] T `body          ` p3 · 10pt · 15 lines
      In this section, we present Dual-approx Bridge in details. The Brownian bridge models [32, 47] have achieved high image quality and diversity in I2I translation. The structure of a Brownian bridge allows it to successfully map between paired probability distributions while generating high quality images of substantial diversity. On the other hand, when it comes to the deterministic I2I translation tasks, diversity is not preferred. In this direction, Dual-approx Bridge delivers deterministic I2I translation with minimal diversity. The key difference between our model and existing diffusion models is that in the generative process, existing models employ one neural network-based approximator which is trained in the forward diffusive process, while we make use of a pair of approximators trained in the forward and reverse diffusive processes separately, shown in Figure 2.

[ 36] · `figure-data   ` p3 · 11pt · 1 lines
      3.1. Score-Based SDE

[ 37] T `body          ` p3 · 10pt · 4 lines
      The score-based Brownian bridge model is prescribed by the forward and reverse SDEs. The forward SDE reads where W (·) is a Brownian motion (i.e., a Wiener process), and g(t) is the variance of the white noise. Then X(1) = Y .

## Page 4 (two columns)

[ 38] · `figure-data   ` p4 · 10pt · 1 lines
      Z t

[ 39] · `figure-data   ` p4 · 10pt · 2 lines
      g(s) dW (s)

[ 40] · `table         ` p4 · 10pt · 3 lines
      That is Xt = (1 − t)X0 + tY + G(t)ϵ, ϵ ∼ N (0, I). (3) The reverse generative SDE [2] is given by

[ 41] T `body          ` p4 · 10pt · 19 lines
      where W (·) is a reverse time Brownian motion, and the score function is given by G(t) Hence, in the reverse transitional formula where ∆t is the time increment we need to estimate two quantities,√ X0 and ∆W = W (t) − W (t − ∆t) = ∆tz, at each time step. In the SDE model, z is just a random variable of the standard normal distribution. This causes the diversity in the output Xˆ0. To make the sampling deterministic, we use a neural network ϵθ to estimate X0 in the forward diffusion process and a second neural network Zϕ(Xt, t) to estimate z in the reverse diffusion process. That is, we train a pair of dual approximators ϵθ and Zϕ. Note that our goal here is to generate a unique output from a given input, rather than translating probability distributions. So, we need two neural networks to approximate two different samples for the forward and reverse steps from the same white noise distribution. A single approximator cannot serve this purpose.

[ 42] T `body          ` p4 · 10pt · 3 lines
      3.2. Training of Neural Network Approximators For simplicity, we take the variance of the white noise g(t) = 1. Then G(t) = t(1 − t).

[ 43] T `body          ` p4 · 10pt · 10 lines
      Forward Training Objective: We design a neural network ϵθ to minimize, for t = 1, . . . , T , ϵ ∼ N (0, I), Here Xt is defined by Equation 3 with G(t) = t(1 − t). This is the same training process as that of the Brownian bridges[47]. That is, we do the back propagation of where t ∼ Uniform(1, . . . , T ) and ϵ ∼ N (0, I). Essentially, the neural network ϵθ is used to estimate X0 given Xt at the time step t. Note that an optional conditional network design ϵθ (Xt, t, Y ) can also be used, which may improve the stability and efficiency of model training.

[ 44] T `body          ` p4 · 10pt · 7 lines
      Reverse Training Objective: Independently of the forward training, we design a neural network Zϕ(Xt, t) to minimize, for t = 1, . . . , T , where Xt is defined by Xt = (1−t)X0 +tY + t(1 − t)z. That is, we do the back propagation of We discretize Equation 4 with g(t) = 1 to get the iterative generative formula:

[ 45] T `heading       ` p4 · 11pt · 1 lines
      3.3. Sampling

[ 46] T `body          ` p4 · 10pt · 3 lines
      We employ the two neural networks in this way: X0 ≈ Xt − ϵθ (Xt, t), while W (t) − W (t − ∆t) must be approximated with the use of the second neural network Zϕ.

[ 47] T `body          ` p4 · 10pt · 8 lines · continues on the next page
      We make an observation here: W (t) − W (t − ∆t) and W (t + ∆t) − W (t) are independent, equivalent random variables. Let g(t) = 1 in (4) and (5) to get Xt = Hence, by plugging the above estimate into Equation 9, we get the final iterative generative formula In the formula (12), replace t by mt = T and ∆t by T if we apply the uniform sampling schedule with T time steps. Also, we estimate X0 by Algorithm 1 Forward Approximator Training Algorithm 1: Input Paired Dataset Dx,y , Forward Network ϵθ , Total Time Steps T 2: repeat Algorithm 2 Reverse Approximator Training Algorithm 1: Input Paired Dataset Dx,y , Reverse Network Zϕ, Total Time Steps T 2: repeat This iterative formula does not apply when t = T as XT +1 does not exist. So we define XT −1 as we would in the SDE model as the final output of the algorithm.

[ 48] · `figure-data   ` p4 · 7pt · 1 lines
      R t dW

[ 49] · `figure-data   ` p4 · 10pt · 2 lines
      where Z t dW

## Page 5 (two columns)

[ 50] T `body          ` p5 · 10pt · 12 lines · (continuation of a paragraph from the previous page)
      Algorithm 1 Forward Approximator Training Algorithm 1: Input Paired Dataset Dx,y , Forward Network ϵθ , Total Time Steps T 2: repeat Algorithm 2 Reverse Approximator Training Algorithm 1: Input Paired Dataset Dx,y , Reverse Network Zϕ, Total Time Steps T 2: repeat This iterative formula does not apply when t = T as XT +1 does not exist. So we define XT −1 as we would in the SDE model as the final output of the algorithm.

[ 51] · `figure-data   ` p5 · 10pt · 1 lines
      Finally, we define

[ 52] T `body          ` p5 · 10pt · 6 lines
      The only randomness introduced in the entire sampling process is in XT −1, which should be negligible, as the coefficient √T of z is fairly small compared to that of Y . On the contrary, SDE models introduce randomness at every sampling step and hence cause substantial diversity to the output.

[ 53] T `heading       ` p5 · 11pt · 1 lines
      3.4. Algorithm

[ 54] T `body          ` p5 · 10pt · 4 lines
      In a given paired dataset Dx,y , (x, y)  denotes a paired im-  p ages from the set. Define B(t) = G and we have the training and sampling algorithms shown in Algorithms 1 to 3, respectively.

[ 55] T `body          ` p5 · 10pt · 6 lines
      Algorithm 3 Sampling Algorithm (Refactored) Input: y, ϵθ , Zϕ Output: x0 1: xt = y In this section, we verify the capability of Dual-approx Bridge, addressing the following questions:

[ 56] T `heading       ` p5 · 12pt · 1 lines
      4. Experiments

[ 57] T `body          ` p5 · 10pt · 5 lines
      • How do varying the number of sampling steps impact its performance in terms of image quality and faithfulness to GT? Furthermore, how does the sampling variance of our model compare to that of SDE-based samplers in terms of faithfulness to GT?

[ 58] T `body          ` p5 · 10pt · 4 lines
      • How does Dual-approx Bridge perform in terms of faithfulness to GT compared to other models in image-toimage translation tasks that demand high faithfulness and deterministic result?

[ 59] T `body          ` p5 · 10pt · 4 lines
      • How does Dual-approx Bridge perform in general imageto-image translation tasks, which prioritize image quality, when compared to other models including GANs, Diffusion models, and Bridge models?

[ 60] T `body          ` p5 · 10pt · 13 lines
      To address these questions, we used datasets with the following resolutions: Cityscapes [10] (256×256), Edges2Handbags [56] (64×64), DF2K [45] (256×256), Urban100 [22] (256×256 patches), and BSD100 [34] (256×256 patches). For evaluation, we used FID [18] to assess image realism (lower is better), LPIPS [53] for perceptual similarity (lower is better), PSNR for pixel-level similarity (higher is better) and SSIM [49] for structural similarity (closer to 1 is better). Our super-resolution (SR) experiments followed the experimental design of [8]. All of our experiments were implemented using PyTorch [38] and were run on a machine with two NVIDIA RTX A6000 GPUs.

## Page 6 (two columns)

[ 61] T `table-caption ` p6 · 9pt · 4 lines
      Table 1. Quantitative comparison with different sampling steps on the Cityscapes dataset. Bold values represent the best performance. Standard Deviation is obtained by five sampling trials for the same input.

[ 62] T `heading       ` p6 · 11pt · 1 lines
      4.1. Ablation Study

[ 63] T `body          ` p6 · 10pt · 18 lines
      4.1.1. Impact of Sampling Steps We first evaluate the impact of sampling steps on our model’s performance in the label-to-photo translation task on the Cityscapes dataset. Since the forward approximator in our model can predict x0 given xt, sampling can be stopped at any time, allowing us to test sampling performance with a different number of steps. Table 1 presents how the varying sampling steps affect both image quality and faithfulness. It demonstrates that 1,000 sampling steps yield satisfactory image quality, with FID reaching a minimum of 42.70 and LPIPS dropping to 0.442. However, this comes at the cost of reduced faithfulness when compared to results obtained using fewer sampling steps, as evidenced by the decline in PSNR and SSIM. Notably, with only three sampling steps, our model achieves its peak in terms of faithfulness, attaining 16.99 PSNR and 57.4% SSIM. This demonstrates the model’s adaptability to meet the diverse requirements of various applications.

[ 64] T `body          ` p6 · 10pt · 14 lines
      Additionally, we assessed the variance of the output fidelity in five independent sampling trials given the same input. Clearly, even at a higher sampling step of 1,000, the standard deviation of PSNR and SSIM remained low (0.02 and 0.07%, respectively), and it approaches zero with three sampling steps. This robustness underscores the superiority of our model in consistently producing high-quality and faithful results with minimal variability. Consequently, we employed three sampling steps for better robustness and higher efficiency in our subsequent experiments, unless otherwise specified. Our experiments show that three iterations perform well across these metrics, though further research is needed to determine the optimal number of sampling steps for different tasks.

[ 65] T `body          ` p6 · 10pt · 9 lines
      4.1.2. Faithfulness Evaluation We then compare the faithfulness of Dual-approx Bridge to other Brownian bridge models with SDE-based [32, 47] and PF-ODE-based samplers on the Cityscapes dataset using PSNR and SSIM metrics. Both the SDE-based and PF-ODE-based samplers use 1,000 sampling steps. The Brownian bridge model, as the leading I2I translation method, is an ideal benchmark for us due to the same bridge structure. As shown in Table 2, our Dual-approx Bridge clearly

[ 66] T `table-caption ` p6 · 9pt · 4 lines
      Table 2. Quantitative comparison with Brownian bridges using SDE and PF-ODE-based samplers on Cityscape. Bold values represent the best performance. Standard deviation is obtained by five sampling trials for the same input.

[ 67] T `figure-caption` p6 · 9pt · 6 lines
      Figure 3. Qualitative comparison with Brownian bridges using SDE-based and PF-ODE-based samplers on Edges2Handbags. Three sampling trials are conducted by each model given the same input. Standard deviation among sampling results by our model, SDE-based and PF-ODE-based sampler are 0.0001, 0.1030 and 0, respectively.

[ 68] T `body          ` p6 · 10pt · 9 lines
      outperforms SDE-based and PF-ODE-based samplers. The PSNR value increased by approximately 12% compared to the second-best, the PF-ODE-based sampler, while the SSIM value showed an overall improvement of 12%, rising from 51.2% to 57.4%. Notably, the metrics of the Dualapprox Bridge exhibited minimal variance, whereas SDEbased sampler exhibited substantial variance in PSNR and SSIM due to the presence of white noise in every step of its sampling.

[ 69] T `body          ` p6 · 10pt · 7 lines
      Figure 3 shows three sample images by each model with the same input in the Edges2Handbags dataset. The images generated by SDE-based sampler are rich in detail but distinct from each other. The PF-ODE-based sampler produces consistent results but lacks details, resulting in a blurred appearance. As a comparison, Dual-approx Bridge achieves SDE-level quality with high and consistent faithfulness.

[ 70] T `body          ` p6 · 10pt · 7 lines · continues on the next page
      4.2. Deterministic Image-to-Image Translation We selected the label-to-photo task in the Cityscapes dataset for deterministic image generation, where the goal is to generate realistic images from segmentation maps. Faithfulness is essential in this task, as it ensures the generated images accurately reflect the structure and content of the input labels, preserving the integrity of labeled features. We also included image super-resolution as a deterministic image-toimage translation task, which also requires both high quality and faithfulness.

## Page 7 (two columns)

[ 71] T `table-caption ` p7 · 9pt · 3 lines
      Table 3. Quantitative comparison with deterministic models on Cityscape. Results of our model are obtained using 200 sampling steps. Bold values represent the best performance.

[ 72] T `figure-caption` p7 · 9pt · 2 lines
      Figure 4. Qualitative comparison between Dual-approx Bridge and SOTA methods on the Cityscapes dataset.

[ 73] T `figure-caption` p7 · 9pt · 1 lines
      Figure 5. Qualitative comparison on BSD100 datasets.

[ 74] T `body          ` p7 · 10pt · 3 lines · (continuation of a paragraph from the previous page)
      cluded image super-resolution as a deterministic image-toimage translation task, which also requires both high quality and faithfulness.

[ 75] T `body          ` p7 · 10pt · 17 lines
      Given the inherent randomness in diffusion models, we primarily chose GAN-based models as baselines for deterministic I2I tasks. We selected Pix2Pix [24], CycleGAN [57], and UNIT [30] for comparison on the Cityscapes dataset. For image super-resolution, we used ESRGAN [48], RankSRGAN [52], and SRDiff [27] as baselines and followed the experimental configuration in [33] to train our model on DF2K and test it on Urban100 and BSD100. Table 3 compares our model against baseline models on the Cityscapes dataset. The Dual-approx Bridge model demonstrates superior performance across all metrics compared to the other models. In terms of image quality, our model achieves a significant improvement in FID, with a score of 48.70 compared to the second-best score of 75.37, representing a substantial 35% performance enhancement. Furthermore, our model exhibits notable gains in PSNR and SSIM, with PSNR increased from 14.61 to 15.70 and SSIM

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
      improved by approximately 50% (from 35.41% to 53.26%). Qualitative comparisons of various methods are presented in Figure 4.

[ 82] T `body          ` p7 · 10pt · 12 lines
      Table 4 compares our model against baselines on superresolution tasks. Our model performed the best on the BSD100 dataset with LPIPS at 0.1267 and PSNR at 26.56. It also achieves the highest LPIPS score of 0.1207 and the second-highest PSNR score of 23.23 on the Urban100 dataset. While SRDiff achieved the best PSNR on Urban100, its diffusion process encounters challenges in consistently producing stable outputs due to the inherent randomness in its SDE-based sampler (as shown in Table 2). Moreover, our model accomplishes this performance with significantly fewer sampling steps (3 used in our model vs. 1,000 used in SRDiff).

[ 83] T `body          ` p7 · 10pt · 7 lines · continues on the next page
      Figure 5 compares the visual quality of various methods for image super-resolution. The top-right of each image shows a zoomed-in view of the red-boxed region for a detailed comparison. Due to inherent randomness, SDEs often introduce unrealistic artifacts, as seen in the example. The PF-ODE-based sampler results exhibit excessive smoothness and the loss of details, as evident in the zoomed regions for both examples. Figure 6 further illustrates that our model can achieve detail preservation approaching or even surpassing that of SDE-based methods. Conversely, the Dual-approx Bridge method demonstrates a remarkable ability to preserve details while maintaining high faithfulness with GT.

## Page 8 (two columns)

[ 84] T `figure-caption` p8 · 9pt · 1 lines
      Figure 7. Qualitative comparison between Dual-approx Bridge and SOTA methods on the Edges2handbags dataset.

[ 85] · `table         ` p8 · 9.5pt · 11 lines
      Method FID ↓ MUNIT 91.4 DRIT 155.3 Distance 85.8 SelfDistance 78.8 CGGAN 105.2 CUT 56.4 FastCUT 68.8 DCLGAN 49.4 SimDCL 51.3 Ours 48.7

[ 86] T `table-caption ` p8 · 9pt · 2 lines
      Table 5. Quantitative comparison of image quality on Cityscapes (label to photo). Bold values represent the best performance.

[ 87] T `figure-caption` p8 · 9pt · 5 lines
      Figure 8. Quantitative comparison between Dual-approx Bridge and A-bridge (with SDE-based sampler). Each model are sampled five times given the same input. Sampling standard deviation of the first example (Ours: 0.0084, A-bridge: 0.0903) and the second example (Ours: 0.0054, SDE: 0.0672).

[ 88] T `body          ` p8 · 10pt · 6 lines · (continuation of a paragraph from the previous page)
      regions for both examples. Figure 6 further illustrates that our model can achieve detail preservation approaching or even surpassing that of SDE-based methods. Conversely, the Dual-approx Bridge method demonstrates a remarkable ability to preserve details while maintaining high faithfulness with GT.

[ 89] · `figure-data   ` p8 · 11pt · 1 lines
      4.3. General Image-to-Image Translation

[ 90] T `body          ` p8 · 10pt · 6 lines
      Finally, we evaluate Dual-approx Bridge on general imageto-image translation tasks. We assess our model’s image quality on the Edges2Handbags and Cityscapes datasets. For Edges2Handbags, we conduct comparisons with Pix2Pix [24], SDEdit [35], DDIB [44], Rectified Flow [31], I2SB [29], DDBM [54], and A-bridge [47]. For the

[ 91] · `table         ` p8 · 9.5pt · 6 lines
      Method FID ↓ Pix2Pix 74.8 DDIB 186.84 SDEdit 85.8 SelfDistance 26.5 Rectified Flow 25.3

[ 92] T `table-caption ` p8 · 10pt · 6 lines
      Table 6. Quantitative comparison of image quality on Edges2Handbags. Bold values represent the best performance. Cityscapes dataset, we compared our model with MUNIT [23], DRIT [26], DistanceGAN [3], Self-DistanceGAN [3], CGGAN [55], CUT [37], FastCUT [37], DCLGAN [17], and SimDCL [17].

[ 93] T `body          ` p8 · 10pt · 14 lines
      On the Cityscapes dataset, our model outperforms all GAN-based models, achieving the top position and surpassing all competitors (Table 5). As shown in Table 6, our model achieves 1.36 FID score on the Edges2Handbags dataset, securing the second place. This result demonstrates that, despite our primary focus on enhancing faithfulness, our model still delivers highly competitive image quality. Figure 7 provides a qualitative comparison of our model with A-bridge on the Edges2Handbags dataset. Although A-bridge achieves the best FID score, it uses SDE-based samplers. As shown in Figure 8, our model demonstrates much higher faithfulness and consistency across repeated sampling with far fewer sampling steps (3 in our model vs. 50 in A-bridge).

[ 94] T `heading       ` p8 · 12pt · 1 lines
      5. Conclusion and Future Work

[ 95] T `body          ` p8 · 10pt · 10 lines
      In this paper, we proposed Dual-approx Bridge, a novel generative model to produce faithful and high quality output for deterministic I2I translations. Our extensive experiments on benchmark datasets demonstrate the consistent and superior performance of Dual-approx Bridge when compared to SOTA I2I models. Our current choice of the SDE follows the Variance Preserving (VP) formulation. Moving forward, we plan to explore the potentials of combining both VP and variance exploding SDEs to further enhance our model’s capabilities.
