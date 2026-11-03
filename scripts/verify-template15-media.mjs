import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve('public/templates/15');
const imageNames = {
  hero: ['mens-hero-desktop.webp', 'mens-hero-mobile.webp'],
  services: [
    'classic-mens-cut.webp','modern-mens-cut.webp','low-fade.webp','mid-fade.webp','high-fade.webp','skin-fade.webp','taper-fade.webp','crew-cut.webp','buzz-cut.webp','textured-crop.webp','french-crop.webp','undercut.webp','side-part.webp','slick-back.webp','pompadour.webp','quiff.webp','long-mens-cut.webp','medium-mens-cut.webp','scissor-cut.webp','mens-hair-trim.webp',
    'mens-global-colour.webp','mens-grey-coverage.webp','mens-root-touchup.webp','mens-highlights.webp','mens-fashion-colour.webp','mens-natural-black.webp','mens-brown-colour.webp','mens-ash-brown.webp','mens-burgundy.webp','mens-colour-consultation.webp',
  ],
  barbers: ['barber-arjun.webp','barber-kabir.webp','barber-dev.webp'],
  about: ['mens-about-story.webp','mens-interior-wide.webp','mens-chair-detail.webp','mens-barber-tools.webp'],
  gallery: ['gallery-mens-fade.webp','gallery-classic-style.webp','gallery-textured-look.webp','gallery-long-hair.webp','gallery-modern-crop.webp','gallery-premium-side-part.webp','gallery-mens-hair-colour.webp','gallery-grey-coverage.webp'],
  offers: ['offer-fresh-fade.webp','offer-mens-colour.webp','offer-new-look.webp'],
  videoThumbnails: ['thumb-mens-haircut-process.webp','thumb-low-fade-transformation.webp','thumb-skin-fade-process.webp','thumb-textured-crop-styling.webp','thumb-mens-grey-coverage.webp','thumb-mens-highlights.webp'],
};
const videoNames = ['mens-haircut-process.mp4','low-fade-transformation.mp4','skin-fade-process.mp4','textured-crop-styling.mp4','mens-grey-coverage-video.mp4','mens-highlights-video.mp4'];
const entries = Object.fromEntries(Object.entries(imageNames).map(([group, names]) => [group, names.map(file => {
  const full = path.join(root, file);
  const exists = fs.existsSync(full);
  return { file, status: exists ? 'present' : 'missing', ...(exists ? { sha256: crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex') } : {}) };
})]));
const legacy = ['hero.webp','fade.webp','colour.webp','long.webp'];
const legacyPresent = legacy.filter(file => fs.existsSync(path.join(root,file))).map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'), note: 'Existing local photo reference; not counted as a unique per-card asset.' }));
const animatedReferenceVideos = ['fade-preview.mp4','colour-preview.mp4','long-preview.mp4'].filter(file => fs.existsSync(path.join(root,file))).map(file => ({ file, status: 'present', contentType: 'animated AI-photo reference; not haircut-process footage' }));
const missingVideoNames = videoNames.filter(file => !fs.existsSync(path.join(root,file)));
const allPresentImages = [...Object.values(entries).flat().filter(x=>x.status==='present').map(x=>x.file), ...legacyPresent.map(x=>x.file)];
const hashes = new Map();
for (const file of allPresentImages) {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
  if (!hashes.has(hash)) hashes.set(hash, []);
  hashes.get(hash).push(file);
}
const exactDuplicates = [...hashes.values()].filter(files=>files.length>1);
const completedCutPaths = ['classic-mens-cut.webp','modern-mens-cut.webp','low-fade.webp','mid-fade.webp','high-fade.webp','skin-fade.webp','taper-fade.webp','crew-cut.webp','buzz-cut.webp','textured-crop.webp','french-crop.webp','undercut.webp','side-part.webp','slick-back.webp','pompadour.webp','quiff.webp','long-mens-cut.webp','medium-mens-cut.webp','scissor-cut.webp','mens-hair-trim.webp'];
const currentServiceRefs = Array.from({length:30}, (_, index) => ({
  serviceIndex: index + 1,
  path: index < completedCutPaths.length ? `/templates/15/${completedCutPaths[index]}` : '/templates/15/colour.webp',
}));
const groupedRefs = refs => Object.entries(refs.reduce((groups, ref) => ((groups[ref.path] ||= []).push(ref.serviceIndex), groups), {})).filter(([, ids]) => ids.length > 1);
let branding = null;
try { branding = JSON.parse(fs.readFileSync(path.join(root,'nexora-branding.json'),'utf8')); } catch {}
const localPhotoFiles = fs.readdirSync(root).filter(file => ['.webp','.jpg','.jpeg'].includes(path.extname(file).toLowerCase()));
const localSvgFiles = fs.readdirSync(root).filter(file => path.extname(file).toLowerCase() === '.svg');
const localVideoFiles = fs.readdirSync(root).filter(file => path.extname(file).toLowerCase() === '.mp4');
const fileSha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const imageBrandMismatches = branding ? localPhotoFiles.filter(file => branding.images?.[file]?.brandedSha256 !== fileSha(file)) : localPhotoFiles;
const svgBrandMismatches = branding ? localSvgFiles.filter(file => branding.svgImages?.[file]?.brandedSha256 !== fileSha(file)) : localSvgFiles;
const videoBrandMismatches = branding ? localVideoFiles.filter(file => branding.videos?.[file]?.brandedSha256 !== fileSha(file)) : localVideoFiles;
const manifest = {
  templateId: 'mens_hair_studio',
  scope: 'Template 15 only',
  note: 'Presence is a filesystem check only. The three new photographs were generated for this task; pre-existing local assets are listed separately. Missing requested assets are intentionally not assigned placeholder URLs or mislabeled as completed.',
  imageGroups: entries,
  existingPhotoReferences: legacyPresent,
  existingPlayablePreviewClips: animatedReferenceVideos,
  requestedProcessVideos: videoNames.map(file=>({file,status:fs.existsSync(path.join(root,file))?'present':'missing',contentType: 'actual male-only haircut or colour process footage required'})),
  branding: branding ? { brand: branding.brand, watermarkAsset: branding.watermarkAsset, brandedImageFiles: Object.keys(branding.images || {}), brandedSvgFiles: Object.keys(branding.svgImages || {}), brandedVideoFiles: Object.keys(branding.videos || {}), exactBrandSpelling: branding.brand === 'NEXORA', unverifiedImageFiles: imageBrandMismatches, unverifiedSvgFiles: svgBrandMismatches, unverifiedVideoFiles: videoBrandMismatches, allPresentMediaBranded: branding.brand === 'NEXORA' && !imageBrandMismatches.length && !svgBrandMismatches.length && !videoBrandMismatches.length } : { status: 'not applied' },
  scan: {
    uniquePresentImageFiles: allPresentImages.length,
    currentServiceImageReferenceCount: currentServiceRefs.length,
    repeatedServiceImagePaths: groupedRefs(currentServiceRefs),
    distinctCurrentServiceImagePaths: [...new Set(currentServiceRefs.map(x=>x.path))].length,
    placeholderIllustrationFiles: fs.readdirSync(root).filter(file => /^(barber-[0-9]+|style-[0-9]+|placeholder)\.svg$/.test(file)),
    exactDuplicateGroups: exactDuplicates,
    missingImageCount: Object.values(entries).flat().filter(x=>x.status==='missing').length,
    missingProcessVideoCount: missingVideoNames.length,
    visuallySimilarImages: 'Not assessed; no perceptual-hash/image-similarity tooling is installed in this workspace.',
  },
};
fs.writeFileSync(path.join(root,'media-manifest.json'), JSON.stringify(manifest,null,2)+'\n');
console.log(`Template 15 media manifest: ${path.join(root,'media-manifest.json')}`);
console.log(`Generated-task image files present: ${Object.values(entries).flat().filter(x=>x.status==='present').length}; requested image files missing: ${manifest.scan.missingImageCount}; requested process videos missing: ${manifest.scan.missingProcessVideoCount}.`);
console.log(`Exact duplicate file hashes: ${exactDuplicates.length ? JSON.stringify(exactDuplicates) : 'none among present local image references'}`);
