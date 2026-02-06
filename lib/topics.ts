// ============================================
// STEM TOPIC CATALOGUE
// Curated topics for Socratic sessions
// ============================================

export interface TopicCategory {
  name: string;
  emoji: string;
  topics: string[];
}

export const TOPIC_CATALOGUE: TopicCategory[] = [
  // ── MATHEMATICS ──────────────────────────────────
  {
    name: "Algebra & Number Theory",
    emoji: "🔢",
    topics: [
      "Why does multiplying two negative numbers give a positive?",
      "What are complex numbers and why do we need them?",
      "How does modular arithmetic work?",
      "Why can't you divide by zero?",
      "What makes a number irrational?",
      "How does the quadratic formula actually work?",
      "What is a group in abstract algebra?",
      "Why are prime numbers so important in cryptography?",
      "What is a field in mathematics?",
      "How do logarithms relate to exponentials?",
      "What is a ring in algebra and why does it matter?",
      "How does polynomial long division work?",
      "What is Fermat's Last Theorem about?",
      "Why is the Fundamental Theorem of Algebra true?",
      "What are eigenvalues and what do they represent?",
    ],
  },
  {
    name: "Calculus & Analysis",
    emoji: "📈",
    topics: [
      "What does a derivative actually measure?",
      "Why is the Fundamental Theorem of Calculus so important?",
      "What is the intuition behind integration?",
      "How do limits formalize the idea of infinity?",
      "What is a Taylor series and why does it work?",
      "Why does e^(iπ) + 1 = 0?",
      "What is the epsilon-delta definition of a limit?",
      "How does L'Hôpital's rule work and when can you use it?",
      "What are partial derivatives and when do you need them?",
      "How does the chain rule work intuitively?",
      "What is a Fourier transform and what is it used for?",
      "Why do some integrals have no closed form?",
      "What is the difference between convergence and divergence of a series?",
      "How do differential equations model real phenomena?",
      "What is the Laplace transform used for?",
    ],
  },
  {
    name: "Linear Algebra",
    emoji: "📐",
    topics: [
      "What does it mean for vectors to be linearly independent?",
      "Why are matrices useful for solving systems of equations?",
      "What is a vector space?",
      "How does matrix multiplication actually work intuitively?",
      "What is the determinant and what does it tell you?",
      "What is singular value decomposition (SVD)?",
      "How do linear transformations relate to matrices?",
      "What is the rank of a matrix?",
      "Why are orthogonal matrices important?",
      "What is the null space of a matrix?",
      "How does PCA (principal component analysis) use linear algebra?",
      "What are tensors and how do they generalize matrices?",
    ],
  },
  {
    name: "Probability & Statistics",
    emoji: "🎲",
    topics: [
      "What is Bayes' theorem and why does it matter?",
      "What is the Central Limit Theorem?",
      "How does a p-value actually work?",
      "What is the difference between correlation and causation?",
      "What is a confidence interval really saying?",
      "How does maximum likelihood estimation work?",
      "What is the law of large numbers?",
      "What is a Markov chain?",
      "How do hypothesis tests work?",
      "What is the difference between Bayesian and frequentist statistics?",
      "What is the Monte Carlo method?",
      "How does linear regression find the best fit line?",
      "What is the birthday paradox and why is it surprising?",
      "What is entropy in information theory?",
    ],
  },
  {
    name: "Geometry & Topology",
    emoji: "🔷",
    topics: [
      "What is non-Euclidean geometry?",
      "What is a manifold?",
      "How does the Pythagorean theorem generalize to higher dimensions?",
      "What is a fractal and what does self-similarity mean?",
      "What makes a Möbius strip special?",
      "What is the Euler characteristic?",
      "How does hyperbolic geometry differ from flat geometry?",
      "What is a topological space?",
      "What does it mean for two shapes to be homeomorphic?",
      "How do projective spaces work?",
    ],
  },
  {
    name: "Logic & Discrete Math",
    emoji: "🧩",
    topics: [
      "What is a proof by contradiction?",
      "How does mathematical induction work?",
      "What is Gödel's incompleteness theorem about?",
      "What is the difference between NP and P problems?",
      "How does graph theory model real-world networks?",
      "What is a bijection and why is it important?",
      "What is the halting problem?",
      "How does combinatorics count arrangements?",
      "What is a Boolean algebra?",
      "What is the pigeonhole principle?",
    ],
  },

  // ── PHYSICS ──────────────────────────────────────
  {
    name: "Classical Mechanics",
    emoji: "⚙️",
    topics: [
      "What is Newton's second law really saying?",
      "How does conservation of energy work?",
      "What is the difference between mass and weight?",
      "How does angular momentum work?",
      "What is the Lagrangian approach to mechanics?",
      "How does a gyroscope stay upright?",
      "What is the principle of least action?",
      "How do tidal forces work?",
      "What is Hamiltonian mechanics?",
      "Why does the Coriolis effect make storms spin?",
    ],
  },
  {
    name: "Electromagnetism",
    emoji: "⚡",
    topics: [
      "What are Maxwell's equations saying in plain English?",
      "How does an electric motor work?",
      "What is an electromagnetic wave?",
      "How does a capacitor store energy?",
      "What is the relationship between electricity and magnetism?",
      "How does electromagnetic induction work?",
      "What is impedance in an AC circuit?",
      "How does a transformer step up voltage?",
      "What is the Poynting vector?",
      "How does an antenna radiate electromagnetic waves?",
    ],
  },
  {
    name: "Quantum Mechanics",
    emoji: "⚛️",
    topics: [
      "What is wave-particle duality?",
      "How does the uncertainty principle work?",
      "What is quantum superposition?",
      "What does the Schrödinger equation describe?",
      "What is quantum entanglement?",
      "How does quantum tunneling work?",
      "What is the measurement problem in quantum mechanics?",
      "What are quantum spin and spinors?",
      "How does a quantum computer use qubits?",
      "What is the double-slit experiment showing us?",
      "What is a wave function collapse?",
      "How does Pauli's exclusion principle explain the periodic table?",
    ],
  },
  {
    name: "Thermodynamics",
    emoji: "🌡️",
    topics: [
      "What is entropy and why does it always increase?",
      "How does a heat engine work?",
      "What is the difference between heat and temperature?",
      "What are the laws of thermodynamics?",
      "What is a phase transition?",
      "How does a refrigerator move heat from cold to hot?",
      "What is the Boltzmann distribution?",
      "What is free energy and why does it matter?",
      "How does statistical mechanics connect to thermodynamics?",
      "What is a black body and how does it radiate?",
    ],
  },
  {
    name: "Relativity & Cosmology",
    emoji: "🌌",
    topics: [
      "Why can't anything travel faster than light?",
      "What does E=mc² actually mean?",
      "How does gravity bend spacetime?",
      "What is a black hole and how does it form?",
      "What is the twin paradox in special relativity?",
      "How does GPS depend on general relativity?",
      "What is dark matter and why do we think it exists?",
      "What is dark energy?",
      "What happened during the Big Bang?",
      "What are gravitational waves?",
    ],
  },

  // ── COMPUTER SCIENCE ─────────────────────────────
  {
    name: "Algorithms & Data Structures",
    emoji: "🌳",
    topics: [
      "How does a hash table work under the hood?",
      "What is Big-O notation really measuring?",
      "How does quicksort work and why is it fast?",
      "What is dynamic programming?",
      "How do balanced binary search trees stay balanced?",
      "What is a graph traversal (BFS vs DFS)?",
      "How does Dijkstra's algorithm find shortest paths?",
      "What is the difference between a stack and a queue?",
      "How do tries work for string matching?",
      "What is memoization and when should you use it?",
      "How does a bloom filter work?",
      "What is amortized time complexity?",
    ],
  },
  {
    name: "Machine Learning & AI",
    emoji: "🤖",
    topics: [
      "How does gradient descent optimize a neural network?",
      "What is backpropagation?",
      "How do transformers and attention mechanisms work?",
      "What is overfitting and how do you prevent it?",
      "How does a convolutional neural network recognize images?",
      "What is reinforcement learning?",
      "How does a GAN generate realistic images?",
      "What is the bias-variance tradeoff?",
      "How do decision trees and random forests work?",
      "What is transfer learning?",
      "How does a large language model generate text?",
      "What is the vanishing gradient problem?",
      "How does batch normalization help training?",
      "What is a loss function and how do you choose one?",
    ],
  },
  {
    name: "Systems & Architecture",
    emoji: "🖥️",
    topics: [
      "How does a CPU execute instructions?",
      "What is the difference between processes and threads?",
      "How does virtual memory work?",
      "What is a cache and why does cache locality matter?",
      "How does an operating system schedule processes?",
      "What is a deadlock and how do you prevent it?",
      "How does TCP ensure reliable data delivery?",
      "What is the CAP theorem?",
      "How does a database index speed up queries?",
      "What is a distributed consensus algorithm (Raft, Paxos)?",
      "How does garbage collection work?",
      "What is the difference between ACID and BASE?",
    ],
  },
  {
    name: "Cryptography & Security",
    emoji: "🔐",
    topics: [
      "How does public-key cryptography (RSA) work?",
      "What is a hash function and what makes it secure?",
      "How does TLS/HTTPS keep web traffic private?",
      "What is a zero-knowledge proof?",
      "How does a blockchain work?",
      "What is a digital signature?",
      "How does AES encryption work?",
      "What is a man-in-the-middle attack?",
      "How does Diffie-Hellman key exchange work?",
      "What are quantum-resistant cryptographic algorithms?",
    ],
  },
  {
    name: "Programming Languages & Theory",
    emoji: "💻",
    topics: [
      "What is a type system and why does it matter?",
      "How do compilers turn code into machine instructions?",
      "What is functional programming?",
      "What is the difference between compiled and interpreted languages?",
      "How does a garbage collector decide what to free?",
      "What is a closure and how does it capture variables?",
      "What is the lambda calculus?",
      "How does pattern matching work in functional languages?",
      "What is a monad and why do Haskell programmers care?",
      "How do async/await and event loops work?",
    ],
  },

  // ── BIOLOGY ──────────────────────────────────────
  {
    name: "Molecular Biology & Genetics",
    emoji: "🧬",
    topics: [
      "How does DNA replication work?",
      "What is CRISPR and how does gene editing work?",
      "How does mRNA get translated into proteins?",
      "What is epigenetics?",
      "How do mutations drive evolution?",
      "What is a gene regulatory network?",
      "How does PCR amplify DNA?",
      "What determines whether a gene is dominant or recessive?",
      "How does RNA splicing work?",
      "What is the central dogma of molecular biology?",
    ],
  },
  {
    name: "Cell Biology & Biochemistry",
    emoji: "🔬",
    topics: [
      "How does cellular respiration produce ATP?",
      "What is the structure and function of a cell membrane?",
      "How does photosynthesis convert light to energy?",
      "What is apoptosis (programmed cell death)?",
      "How do enzymes catalyze reactions?",
      "What is the Krebs cycle doing?",
      "How does signal transduction work in cells?",
      "What is protein folding and why does it matter?",
      "How do antibodies recognize antigens?",
      "What are stem cells and how do they differentiate?",
    ],
  },
  {
    name: "Ecology & Evolution",
    emoji: "🌿",
    topics: [
      "How does natural selection drive evolution?",
      "What is speciation and how does it occur?",
      "How do ecosystems maintain balance?",
      "What is the theory of punctuated equilibrium?",
      "How does genetic drift differ from natural selection?",
      "What causes mass extinction events?",
      "How do food webs model energy flow in ecosystems?",
      "What is the Red Queen hypothesis?",
      "How does symbiosis evolve?",
      "What is kin selection and altruism in evolution?",
    ],
  },
  {
    name: "Neuroscience",
    emoji: "🧠",
    topics: [
      "How does a neuron fire an action potential?",
      "What is neuroplasticity?",
      "How does memory formation work?",
      "What are neurotransmitters and how do they work?",
      "How does the brain process visual information?",
      "What is the default mode network?",
      "How does long-term potentiation relate to learning?",
      "What happens in the brain during sleep?",
      "How does the brain represent language?",
      "What is the connectome?",
    ],
  },

  // ── CHEMISTRY ────────────────────────────────────
  {
    name: "General & Physical Chemistry",
    emoji: "⚗️",
    topics: [
      "What is a chemical bond and why do atoms bond?",
      "How does the periodic table organize elements?",
      "What is electronegativity?",
      "How do chemical equilibria work?",
      "What is Le Chatelier's principle?",
      "How does an acid-base reaction work?",
      "What is a redox reaction?",
      "How does reaction kinetics determine speed of reactions?",
      "What are intermolecular forces?",
      "What is Gibbs free energy telling you about a reaction?",
    ],
  },
  {
    name: "Organic Chemistry",
    emoji: "🧪",
    topics: [
      "What is chirality and why does it matter in biology?",
      "How do organic reaction mechanisms work?",
      "What is aromaticity?",
      "How does a nucleophilic substitution (SN1 vs SN2) work?",
      "What is a carbonyl group and why is it so reactive?",
      "How do polymers form?",
      "What is stereochemistry?",
      "How do enzymes achieve such high specificity?",
      "What is a free radical and how does it react?",
      "How does retrosynthetic analysis plan a synthesis?",
    ],
  },

  // ── ENGINEERING ───────────────────────────────────
  {
    name: "Electrical Engineering",
    emoji: "🔌",
    topics: [
      "How does a transistor work as a switch?",
      "What is a feedback loop in control systems?",
      "How does a PID controller work?",
      "What is signal processing and filtering?",
      "How does an ADC (analog-to-digital converter) work?",
      "What is the Nyquist sampling theorem?",
      "How do op-amps work?",
      "What is a state machine in digital logic?",
      "How does a MOSFET differ from a BJT?",
      "What is impedance matching and why does it matter?",
    ],
  },
  {
    name: "Mechanical & Civil Engineering",
    emoji: "🏗️",
    topics: [
      "How does stress and strain analysis work?",
      "What is finite element analysis (FEA)?",
      "How does a heat exchanger work?",
      "What is fluid dynamics and the Navier-Stokes equation?",
      "How do bridges distribute forces?",
      "What is material fatigue?",
      "How does a turbine convert fluid energy to rotation?",
      "What is Bernoulli's principle?",
      "How does 3D printing / additive manufacturing work?",
      "What is the Reynolds number and what does it predict?",
    ],
  },

  // ── EARTH & SPACE SCIENCE ────────────────────────
  {
    name: "Earth Science & Climate",
    emoji: "🌍",
    topics: [
      "How does plate tectonics drive continental drift?",
      "What causes earthquakes?",
      "How does the greenhouse effect work?",
      "What is the carbon cycle?",
      "How do ocean currents affect climate?",
      "What causes ice ages?",
      "How does radiocarbon dating work?",
      "What is the water cycle and why does it matter?",
      "How do volcanoes form and erupt?",
      "What is the Milankovitch cycle?",
    ],
  },
  {
    name: "Astronomy & Astrophysics",
    emoji: "🔭",
    topics: [
      "How do stars form and evolve?",
      "What is a neutron star?",
      "How do we detect exoplanets?",
      "What is the Hertzsprung-Russell diagram?",
      "How does nuclear fusion power the Sun?",
      "What is a supernova?",
      "How do we measure cosmic distances?",
      "What is the cosmic microwave background radiation?",
      "How do galaxies form and evolve?",
      "What is the Drake equation estimating?",
    ],
  },
];

/** Get a shuffled random selection of N topics (flat, from all categories) */
export function getRandomTopics(count: number): { topic: string; category: string; emoji: string }[] {
  const all: { topic: string; category: string; emoji: string }[] = [];
  for (const cat of TOPIC_CATALOGUE) {
    for (const topic of cat.topics) {
      all.push({ topic, category: cat.name, emoji: cat.emoji });
    }
  }
  // Fisher-Yates shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, count);
}

/** Get one random topic per category */
export function getOnePerCategory(): { topic: string; category: string; emoji: string }[] {
  return TOPIC_CATALOGUE.map((cat) => {
    const topic = cat.topics[Math.floor(Math.random() * cat.topics.length)];
    return { topic, category: cat.name, emoji: cat.emoji };
  });
}
