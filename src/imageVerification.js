'use strict';

/* Xenova Transformers.js AI Image Verification for Olongapo FixIt */

const {CATS}=require('./config');

const PROMPT_TEMPLATES={
 'Broken Streetlight':[
  'a photo of a broken streetlight',
  'a damaged street light pole',
  'a streetlight with broken glass',
  'a non working street lamp at night',
  'a broken outdoor light fixture',
  'a streetlight that needs repair'
 ],
 'Pothole':[
  'a photo of a pothole on the road',
  'a deep pothole in the street',
  'a road with multiple potholes',
  'a large pothole damaging vehicles',
  'a pothole filled with water',
  'a dangerous pothole needing repair',
  'a close up of a pothole in asphalt',
  'a pothole on a barangay road'
 ],
 'Damaged Road':[
  'a photo of a damaged road with potholes',
  'a road with large cracks and potholes',
  'a broken asphalt road surface',
  'a damaged street with uneven pavement',
  'a road in poor condition with holes',
  'a street needing road repair',
  'cracked and deteriorated road surface',
  'a barangay road with severe damage'
 ],
 'Garbage Problem':[
  'a photo of garbage piled up on the street',
  'overflowing trash bins in a residential area',
  'illegal dumping of waste on the roadside',
  'uncollected garbage bags on the sidewalk',
  'a messy pile of rubbish in public area',
  'trash scattered on the ground outdoors',
  'plastic waste and garbage in a drainage canal',
  'a barangay garbage collection issue'
 ],
 'Flooding':[
  'a photo of a flooded street',
  'water flooding a road after heavy rain',
  'a street submerged in flood water',
  'flooded residential area with standing water',
  'a road covered in floodwater',
  'water not draining on a flooded street',
  'a barangay street during flash flood',
  'standing water on a road after typhoon'
 ],
 'Water Leak':[
  'a photo of a water leak on the street',
  'water gushing from a broken pipe',
  'a water main break on the road',
  'water flowing from underground pipe leak',
  'a visible water leak on pavement',
  'water spraying from a damaged pipe',
  'a leaking water pipe on a barangay road',
  'water pooling from a pipe leak outdoors'
 ],
 'Fallen Tree':[
  'a photo of a fallen tree blocking a road',
  'a large tree fallen across the street',
  'a tree uprooted and lying on the road',
  'a fallen tree branch blocking traffic',
  'a storm damaged tree on the roadway',
  'a tree that has fallen on the sidewalk',
  'a typhoon fallen tree blocking barangay road',
  'a large fallen tree trunk on the street'
 ],
 'Blocked Drainage':[
  'a photo of a blocked drainage canal',
  'a clogged storm drain with debris',
  'a drainage canal full of garbage',
  'a blocked sewer grate on the street',
  'water not draining due to blocked drain',
  'a drainage system clogged with waste',
  'a barangay drainage canal blocked by trash',
  'standing water due to clogged drainage'
 ],
 'Damaged Sidewalk':[
  'a photo of a damaged sidewalk',
  'a broken concrete sidewalk with cracks',
  'an uneven hazardous sidewalk surface',
  'a cracked and broken footpath',
  'a sidewalk with missing pavement pieces',
  'a damaged pedestrian walkway',
  'a barangay sidewalk with trip hazards',
  'cracked and broken concrete walkway'
 ],
 'Damaged Public Facility':[
  'a photo of a damaged public bench',
  'a broken playground equipment',
  'a damaged waiting shed at a bus stop',
  'a broken public facility outdoors',
  'a damaged park bench or table',
  'a public structure in need of repair',
  'a broken barangay hall facility',
  'damaged public infrastructure outdoors'
 ],
 'Road Obstruction':[
  'a photo of an object blocking the road',
  'debris blocking a street lane',
  'a large object obstructing traffic',
  'construction materials blocking the road',
  'a vehicle abandoned blocking the road',
  'an obstruction on the roadway',
  'illegal parking blocking barangay road',
  'debris and obstacles on the street'
 ],
 'Other':[
  'a photo of a community issue outdoors',
  'a general problem in a residential area',
  'an outdoor maintenance issue',
  'a neighborhood problem needing attention',
  'a civic issue in a public space',
  'a local problem in the barangay',
  'a municipal issue in Olongapo City',
  'a public works concern',
  'an infrastructure problem outdoors',
  'a general complaint photo'
 ],
 'Unrelated':[
  'a selfie of a person',
  'a portrait photo of a face',
  'a group photo of people smiling',
  'a picture of food on a plate',
  'a screenshot of a phone screen',
  'a photo of a pet dog or cat',
  'a landscape photo with no issues',
  'a photo of a building exterior',
  'a picture of a vehicle',
  'a meme or funny image',
  'a close up of a person face',
  'a photo of a meal or snack',
  'a mobile game screenshot',
  'a picture of a cute animal',
  'a random indoor photo',
  'a selfie with friends',
  'a food delivery photo',
  'a social media post screenshot',
  'a random object on a table',
  'an artistic photo with no civic issue'
 ]
};
PROMPT_TEMPLATES['Unrelated Image']=PROMPT_TEMPLATES['Unrelated'];


function generatePrompts(category){
 const templates=PROMPT_TEMPLATES[category];
 if(!templates)return[];
 return templates.map(t=>`${t}, photo taken in Olongapo City, Philippines`);
}

let clipModel=null, clipProcessor=null;
let loadPromise=null;

async function loadCLIP(){
 if(clipModel && clipProcessor) return {model: clipModel, processor: clipProcessor};
 if(loadPromise) return loadPromise;
 
 loadPromise = (async () => {
  try {
   console.log('[imageVerification] Loading CLIP model (Xenova/clip-vit-base-patch32)...');
   const {AutoModel, AutoProcessor} = await import('@xenova/transformers');
   
   // Load model and processor with progress tracking
   clipModel = await AutoModel.from_pretrained('Xenova/clip-vit-base-patch32', {
    progress: (info) => {
     if (info.status === 'downloading' && info.file) {
      console.log(`[imageVerification] Downloading ${info.file}: ${Math.round(info.progress * 100)}%`);
     } else if (info.status === 'ready') {
      console.log('[imageVerification] Model loaded successfully');
     }
    }
   });
   
   clipProcessor = await AutoProcessor.from_pretrained('Xenova/clip-vit-base-patch32', {
    progress: false
   });
   
   console.log('[imageVerification] CLIP model and processor ready');
   return {model: clipModel, processor: clipProcessor};
  } catch (e) {
   console.error('[imageVerification] Failed to load CLIP model:', e.message);
   loadPromise = null;
   throw e;
  }
 })();
 
 return loadPromise;
}

/**
 * Decode base64 image and create RawImage properly
 * @param {string} base64 - Base64 encoded image data
 * @returns {Promise<RawImage>} - Properly sized RawImage
 */
async function decodeImage(base64) {
 const {RawImage} = await import('@xenova/transformers');
 
 // Remove data URL prefix if present
 const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
 
 // Decode base64 to binary
 const binary = atob(base64Data);
 const bytes = new Uint8Array(binary.length);
 for (let i = 0; i < binary.length; i++) {
  bytes[i] = binary.charCodeAt(i);
 }
 
 // Create RawImage from bytes - this will auto-detect format and dimensions
 const image = await RawImage.fromBytes(bytes);
 
 console.log(`[imageVerification] Decoded image: ${image.width}x${image.height}, channels: ${image.channels}`);
 return image;
}

/**
 * Compute CLIP similarity scores between image and text prompts
 * @param {string} imageBase64 - Base64 encoded image
 * @param {string[]} prompts - Text prompts to compare against
 * @returns {Promise<number[]>} - Similarity scores for each prompt
 */
async function clipScore(imageBase64, prompts) {
 const {model, processor} = await loadCLIP();
 
 // Decode and preprocess image
 const image = await decodeImage(imageBase64);
 
 // Use processor to prepare both image and text inputs
 // This handles resizing, normalization, tokenization automatically
 const inputs = await processor(
  {images: image, text: prompts},
  {return_tensors: 'pt', padding: true}
 );
 
 // Run inference
 const outputs = await model.generate({...inputs, return_dict: true});
 
 // Get image and text embeddings
 const imageEmbeds = outputs.image_embeds; // [1, 512]
 const textEmbeds = outputs.text_embeds;   // [num_prompts, 512]
 
 // Normalize embeddings for cosine similarity
 const imageNorm = imageEmbeds.div(imageEmbeds.norm(2, -1, true));
 const textNorm = textEmbeds.div(textEmbeds.norm(2, -1, true));
 
 // Compute cosine similarity: image_norm @ text_norm.T
 const similarities = imageNorm.matmul(textNorm.transpose(0, 1)).squeeze(0).tolist();
 
 return similarities;
}

function aggregateScoresByCategory(scoresByCategory){
 let categoryScores={};
 if(Array.isArray(scoresByCategory)){
  for(const item of scoresByCategory){
   if(!categoryScores[item.category]) categoryScores[item.category]=[];
   categoryScores[item.category].push({score: item.score, prompt: item.prompt});
  }
 } else {
  categoryScores = scoresByCategory;
 }
 
 const results=[];
 for(const [category, scores] of Object.entries(categoryScores)){
  let maxScore=-Infinity;
  let bestPrompt=null;
  let sum=0;
  if(Array.isArray(scores) && scores.length && typeof scores[0]==='object'){
   for(const s of scores){
    sum+=s.score;
    if(s.score > maxScore){
     maxScore=s.score;
     bestPrompt=s.prompt;
    }
   }
  } else {
   for(const s of scores){
    sum+=s;
    if(s > maxScore) maxScore=s;
   }
  }
  const avgScore=sum/scores.length;
  results.push({category, score: maxScore, maxScore, avgScore, bestPrompt, promptCount: scores.length});
 }
 results.sort((a,b)=>b.maxScore-a.maxScore);
 return results;
}

function buildTopCandidates(ranked, targetCategory){
 const top3 = ranked.slice(0,3).map(r => ({
  category: r.category,
  score: Number(r.maxScore.toFixed(3)),
  prompt: r.bestPrompt || r.category
 }));
 return top3;
}

function decideWithThresholds(targetCategory, scoredCategories){
 // Unrelated Image category should always be REJECTED
 if(targetCategory === 'Unrelated Image'){
  const ranked = scoredCategories
   .map(c => ({category: c.category, maxScore: c.score, avgScore: c.score, promptCount: 1}))
   .sort((a,b)=>b.maxScore-a.maxScore);
  const top3Candidates = buildTopCandidates(ranked, targetCategory);
  return {status: 'REJECTED', category: targetCategory, score: 0, rank: 99, top3Candidates, verificationMethod: 'xenova'};
 }
 
 const ranked = scoredCategories
  .map(c => ({category: c.category, maxScore: c.score, avgScore: c.score, promptCount: 1}))
  .sort((a,b)=>b.maxScore-a.maxScore);
 
 // Find target category's rank and score
 const targetIdx = ranked.findIndex(r => r.category === targetCategory);
 const targetScore = targetIdx >= 0 ? ranked[targetIdx].maxScore : 0;
 const targetRank = targetIdx >= 0 ? targetIdx + 1 : ranked.length + 1;
 const top3Candidates = buildTopCandidates(ranked, targetCategory);
 
 // Apply thresholds based on target category
 let status;
 if(targetScore >= 0.30 && targetRank === 1){
  status = 'MATCH';
 } else if(targetScore < 0.22 || targetRank > 3){
  status = 'REJECTED';
 } else {
  status = 'REVIEW_REQUIRED';
 }
 
 return {
  status,
  category: targetCategory,
  score: targetScore,
  rank: targetRank,
  top3Candidates,
  verificationMethod: 'xenova'
 };
}

// Backward compatibility wrapper
function decideStatus(ranked){
 if(!ranked.length) return {status: 'AI_UNAVAILABLE', topCategory: null, score: 0, rank: 0};
 const top = ranked[0];
 if(top.maxScore >= 0.30 && ranked[0] === top) return {status: 'MATCH', topCategory: top.category, score: top.maxScore, rank: 1};
 if(top.maxScore < 0.22 || ranked.findIndex(r => r.category === top.category) > 2) return {status: 'REJECTED', topCategory: top.category, score: top.maxScore, rank: ranked.findIndex(r => r.category === top.category) + 1};
 return {status: 'REVIEW_REQUIRED', topCategory: top.category, score: top.maxScore, rank: ranked.findIndex(r => r.category === top.category) + 1};
}

/**
 * Verify an image against a category
 * @param {Object} params
 * @param {string} params.category - Selected category
 * @param {string} params.photo - Base64 encoded image (data URL or raw base64)
 * @returns {Promise<Object>} Verification result
 */
async function verifyImage({category, photo}){
 if(!CATS.includes(category)) throw new Error('Invalid category');
 
 // Skip actual verification in test mode
 if(process.env.IMAGE_VERIFY_DISABLED === '1'){
  return {
   status: 'MATCH',
   category,
   score: 0.85,
   rank: 1,
   explanation: 'Test mode: AI verification disabled',
   top3Candidates: [{category, score: 0.85}, {category: 'Other', score: 0.10}, {category: 'Unrelated', score: 0.05}],
   verificationMethod: 'TEST_MOCK',
   geminiConfidence: null,
   analyzedAt: new Date().toISOString()
  };
 }
 
 const base64 = photo.split(',')[1] || photo;
 const allCategories = [...CATS, 'Unrelated'];
 const scoresByCategory = {};
 
 // Process each category with timeout protection
 const CLIP_TIMEOUT_MS = 60000; // 60 second timeout per category
 
 for(const cat of allCategories){
  const prompts = generatePrompts(cat);
  if(prompts.length === 0){
   scoresByCategory[cat] = [0];
   continue;
  }
  
  try {
   // Race between clipScore and timeout
   const scores = await Promise.race([
    clipScore(base64, prompts),
    new Promise((_, reject) => 
     setTimeout(() => reject(new Error(`CLIP inference timeout for category ${cat}`)), CLIP_TIMEOUT_MS)
    )
   ]);
   scoresByCategory[cat] = scores;
   console.log(`[imageVerification] Category "${cat}": max score = ${Math.max(...scores).toFixed(3)}`);
  } catch (e) {
   console.error(`[imageVerification] Error processing category "${cat}":`, e.message);
   // Assign low score on error
   scoresByCategory[cat] = new Array(prompts.length).fill(0);
  }
 }
 
 // Use decideWithThresholds as primary decision logic
 const clipDecision = decideWithThresholds(category, allCategories.map(cat => ({
  category: cat,
  score: Math.max(...scoresByCategory[cat])
 })));
 
 const topCandidates = buildTopCandidates(
  aggregateScoresByCategory(scoresByCategory),
  category
 );

 let explanation = `CLIP analysis: ${clipDecision.status} for "${clipDecision.category}" (category match score: ${clipDecision.score?.toFixed?.(3) || clipDecision.score}, rank: ${clipDecision.rank})`;
 
 return {
  status: clipDecision.status,
  category: clipDecision.category,
  score: clipDecision.score,
  rank: clipDecision.rank,
  explanation,
  top3Candidates: topCandidates,
  verificationMethod: 'CLIP_ONLY',
  geminiConfidence: null,
  analyzedAt: new Date().toISOString()
 };
}

async function verifyForReport(category, photo){
 const result = await verifyImage({category, photo});
 // Transform to format expected by createReport
 const topCand = result.top3Candidates?.[0];
 const transformed = {
  status: result.status,
  selectedCategory: category,
  predictedCategory: topCand?.category || null,
  bestMatchDescription: topCand?.prompt || null,
  similarityScore: result.score,
  explanation: result.explanation,
  modelName: 'Xenova/clip-vit-base-patch32',
  analyzedAt: result.analyzedAt
 };
 if(transformed.status === 'REJECTED'){
  transformed.explanation = 'The uploaded image does not match the selected problem category. Please upload an actual photo of the reported public issue.';
 }
 return transformed;
}

function unavailableResult(category, reason){
 return {
  status: 'AI_UNAVAILABLE',
  category: category || null,
  score: 0,
  rank: 0,
  explanation: reason || 'AI verification service is currently unavailable. Please try again later or proceed without verification.',
  reason: reason || 'AI verification service is currently unavailable. Please try again later or proceed without verification.',
  top3Candidates: [],
  verificationMethod: 'xenova',
  geminiConfidence: null
 };
}

module.exports = {verifyImage, verifyForReport, unavailableResult, CATS, generatePrompts, aggregateScoresByCategory, decideStatus, decideWithThresholds};