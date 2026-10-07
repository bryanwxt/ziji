#!/usr/bin/env bash
# Install one TTS engine (and, with --check, the ASR checker) on an Ubuntu runner, Python 3.10 (spec 2026-10-06 §4).
set -euo pipefail
engine="$1"; check="${2:-}"
sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg espeak-ng
python -m pip install -q --upgrade pip
python -m pip install -q numpy soundfile
# The zero-shot engines all copy one voice: CosyVoice's sample prompt (engines.py REF_TEXT), at $TTS_REF_WAV
ref() {
  mkdir -p "$(dirname "${TTS_REF_WAV:-$HOME/tts-ref/prompt.wav}")"
  if [ -n "${1:-}" ]; then cp "$1" "${TTS_REF_WAV:-$HOME/tts-ref/prompt.wav}"
  else curl -fsSL -o "${TTS_REF_WAV:-$HOME/tts-ref/prompt.wav}" https://github.com/FunAudioLLM/CosyVoice/raw/main/asset/zero_shot_prompt.wav; fi
}
case "$engine" in
  kokoro) python -m pip install -q "kokoro>=0.9.4" "misaki[zh]>=0.9.4" ;;
  melo)
    python -m pip install -q git+https://github.com/myshell-ai/MeloTTS.git
    python -m unidic download ;;
  cosyvoice2|cosyvoice3)
    # Only what CPU inference needs: CPU torch, and CosyVoice's requirements less the GPU, training and serving ones
    # (deepspeed, tensorrt, onnxruntime-gpu, gradio, fastapi, grpc, tensorboard), which broke or slowed the first tries.
    root="${COSYVOICE_ROOT:-$HOME/cosyvoice}"
    # openai-whisper still builds with pkg_resources, which setuptools 81 dropped: pin it, build environments included
    echo "setuptools<81" > "$RUNNER_TEMP/constraints.txt"; export PIP_CONSTRAINT="$RUNNER_TEMP/constraints.txt"
    python -m pip install -q "setuptools<81" wheel
    python -m pip install -q torch==2.3.1 torchaudio==2.3.1 --index-url https://download.pytorch.org/whl/cpu
    python -m pip install -q --no-build-isolation "openai-whisper==20231117"  # the version CosyVoice pins, built with the pinned setuptools
    git clone -q --recursive --depth 1 https://github.com/FunAudioLLM/CosyVoice.git "$root"
    grep -vE '^(--|deepspeed|gradio|fastapi|grpcio|tensorrt|onnxruntime|tensorboard|uvicorn|torch|openai-whisper)' "$root/requirements.txt" > "$RUNNER_TEMP/cv-req.txt"
    echo "onnxruntime==1.18.0" >> "$RUNNER_TEMP/cv-req.txt"
    python -m pip install -q -r "$RUNNER_TEMP/cv-req.txt" huggingface_hub
    if [ "$engine" = cosyvoice2 ]; then
      python -c "from huggingface_hub import snapshot_download as d; d('FunAudioLLM/CosyVoice2-0.5B', local_dir='$root/pretrained_models/CosyVoice2-0.5B')"
    else  # the RL-tuned LLM (fewer misread characters, the repo's own table): fetched in place of the base one
      m="$root/pretrained_models/Fun-CosyVoice3-0.5B"
      python -c "from huggingface_hub import snapshot_download as d; d('FunAudioLLM/Fun-CosyVoice3-0.5B-2512', local_dir='$m', ignore_patterns=['llm.pt'])"
      mv "$m/llm.rl.pt" "$m/llm.pt"
    fi
    ref "$root/asset/zero_shot_prompt.wav" ;;
  indextts2|indextts25)
    root="${INDEXTTS_ROOT:-$HOME/index-tts}"
    git clone -q --depth 1 https://github.com/index-tts/index-tts.git "$root"
    python -m pip install -q torch==2.8.0 torchaudio==2.8.0 --index-url https://download.pytorch.org/whl/cpu
    python -m pip install -q -e "$root" huggingface_hub
    if [ "$engine" = indextts2 ]; then repo=IndexTeam/IndexTTS-2; dir=checkpoints_2; else repo=IndexTeam/IndexTTS-2.5; dir=checkpoints; fi
    python -c "from huggingface_hub import snapshot_download as d; d('$repo', local_dir='$root/$dir')"
    ref ;;
  spark)
    root="${SPARK_ROOT:-$HOME/spark-tts}"
    git clone -q --depth 1 https://github.com/SparkAudio/Spark-TTS.git "$root"
    python -m pip install -q torch==2.5.1 torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cpu
    grep -vE '^(torch|gradio)' "$root/requirements.txt" > "$RUNNER_TEMP/spark-req.txt"
    python -m pip install -q -r "$RUNNER_TEMP/spark-req.txt" huggingface_hub
    python -c "from huggingface_hub import snapshot_download as d; d('SparkAudio/Spark-TTS-0.5B', local_dir='$root/pretrained_models/Spark-TTS-0.5B')"
    ref ;;
  *) echo "unknown engine: $engine" >&2; exit 2 ;;
esac
if [ "$check" = "--check" ]; then python -m pip install -q faster-whisper pypinyin; fi
