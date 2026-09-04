# Demo recording

`demo.gif` is the recording shown at the top of the main README. It was captured by driving the real demo page in headless Chromium — see `../../build/record.js` — so it stays accurate if the toolkit changes.

To re-record after a change:

```bash
python3 -m http.server 8099        # from the repository root
node build/record.js               # writes frames/
ffmpeg -y -framerate 10 -pattern_type glob -i 'frames/*.png' \
  -vf "fps=10,scale=900:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" \
  -loop 0 docs/media/demo.gif
```

Needs `puppeteer-core`, a Chromium binary, and ffmpeg.
