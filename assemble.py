#!/usr/bin/env python3
"""
Wrapper para scripts/assemble.py.
Executa a montagem modular da aplicação estática para Vercel.
"""
import subprocess
import sys
import os

script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scripts", "assemble.py")
sys.exit(subprocess.call([sys.executable, script] + sys.argv[1:]))
