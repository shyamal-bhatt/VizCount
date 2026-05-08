#!/bin/bash
find src -type f \( -name "*.tsx" -o -name "*.ts" \) | while read file; do
  awk '
  /^[[:space:]]*export function/ || /^[[:space:]]*function / || /^[[:space:]]*const [A-Z].*=[[:space:]]*\(/ {
    in_component = 1
    found_return = 0
  }
  /^[[:space:]]*if[[:space:]]*\(.*return/ || /^[[:space:]]*return[[:space:]]+(null|undefined|<)/ {
    if (in_component) found_return = 1
  }
  /^[[:space:]]*(const|let|var)[[:space:]].*=[[:space:]]*use[A-Z]/ {
    if (in_component && found_return) {
      print FILENAME ":" NR ": " $0
    }
  }
  /^[[:space:]]*use[A-Z]/ {
    if (in_component && found_return) {
      print FILENAME ":" NR ": " $0
    }
  }
  /^}/ {
    if ($0 ~ /^}[[:space:]]*$/) {
      in_component = 0
      found_return = 0
    }
  }
  ' "$file"
done
