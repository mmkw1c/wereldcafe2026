# WebAR Template

## Wat moet je vervangen?

Zet deze bestanden in de juiste map:

- `public/assets/video.mp4`
- `public/assets/model.glb`
- `public/targets/targets.mind`

## Installatie

```bash
npm install
npm start

Open daarna:

http://localhost:3000
Gebruik

Klik op Start AR

Geef camera-toegang

Richt de camera op de target-afbeelding

Belangrijk

targets.mind is verplicht

video moet mp4 zijn

model moet glb zijn

host later via HTTPS voor mobiel testen buiten localhost


---

#Hoe iemand anders het gebruikt

Na clone:

```bash
git clone jouw-repo-url
cd webar-template
npm install
npm start

Daarna hoeven ze alleen dit te doen:

video.mp4 in public/assets/

model.glb in public/assets/

targets.mind in public/targets/

Verder niets.