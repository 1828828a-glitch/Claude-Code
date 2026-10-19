#!/bin/bash
# 動画で使うフォント(すべて SIL Open Font License)を Google Fonts のリポジトリから取得する
set -e
cd "$(dirname "$0")"
mkdir -p fonts
for f in zenmarugothic/ZenMaruGothic-Medium.ttf zenmarugothic/ZenMaruGothic-Bold.ttf zenmarugothic/ZenMaruGothic-Black.ttf \
         kleeone/KleeOne-SemiBold.ttf yomogi/Yomogi-Regular.ttf \
         zenkakugothicnew/ZenKakuGothicNew-Medium.ttf zenkakugothicnew/ZenKakuGothicNew-Bold.ttf; do
  [ -f "fonts/$(basename $f)" ] || curl -sSfL -o "fonts/$(basename $f)" "https://raw.githubusercontent.com/google/fonts/main/ofl/$f"
done
