#!/bin/sh
echo "Hello Word"
sleep 2
echo "j'ai recu :"
cat -
echo "je provoque une erreur " >&2
exit 255