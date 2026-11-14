#!/bin/bash
# For each new "request:N" answer due, reads PR N every second until GitHub knows `mergeable`.
R=attomius321/symbiote-hv12-scratch
F=/tmp/hv12-real/loc/symbiote/issues/answers.jsonl
done_list=" 9 10 "
while true; do
  for n in $(grep -o '"key":"request:[0-9]*"' $F | grep -o '[0-9]*' | sort -u); do
    case "$done_list" in *" $n "*) continue;; esac
    done_list="$done_list$n "
    (for i in $(seq 1 120); do
      line=$(gh api repos/$R/pulls/$n --jq '"\(.created_at) mergeable=\(.mergeable) state=\(.mergeable_state)"' 2>&1)
      echo "$(date -u +%FT%T.%3NZ) PR #$n $line"
      case "$line" in *mergeable=true*|*mergeable=false*) break;; esac
      sleep 1
    done) >> "${OUT:-.}/mergeable.log" &
  done
  sleep 1
done
