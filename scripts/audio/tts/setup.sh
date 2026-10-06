#!/usr/bin/env bash
# Install one TTS engine (and, with --check, the ASR checker) on an Ubuntu runner, Python 3.10 (spec 2026-10-06 §4).
set -euo pipefail
engine="$1"; check="${2:-}"
sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg espeak-ng
python -m pip install -q --upgrade pip
python -m pip install -q numpy soundfile
case "$engine" in
  kokoro) python -m pip install -q "kokoro>=0.9.4" "misaki[zh]>=0.9.4" ;;
  melo)
    python -m pip install -q git+https://github.com/myshell-ai/MeloTTS.git
    python -m unidic download ;;
  cosyvoice)
    root="${COSYVOICE_ROOT:-$HOME/cosyvoice}"
    # openai-whisper still builds with pkg_resources, which setuptools 81 dropped: pin it, build environments included
    echo "setuptools<81" > "$RUNNER_TEMP/constraints.txt"; export PIP_CONSTRAINT="$RUNNER_TEMP/constraints.txt"
    python -m pip install -q "setuptools<81" wheel
    python -m pip install -q --no-build-isolation openai-whisper  # builds with the pinned setuptools, not a fresh one
    git clone -q --recursive --depth 1 https://github.com/FunAudioLLM/CosyVoice.git "$root"
    python -m pip install -q -r "$root/requirements.txt"
    python -c "from modelscope import snapshot_download; snapshot_download('iic/CosyVoice2-0.5B', local_dir='$root/pretrained_models/CosyVoice2-0.5B')" ;;
  *) echo "unknown engine: $engine" >&2; exit 2 ;;
esac
if [ "$check" = "--check" ]; then python -m pip install -q faster-whisper pypinyin; fi
