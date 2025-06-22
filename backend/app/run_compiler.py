import subprocess
import os

def run_c_compiler(code: str):
    try:
        compiler_path = os.path.abspath("./backend/compiler/compiler.exe")

        result = subprocess.run(
            [compiler_path],
            input=code,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=10
        )

        if result.returncode == 0:
            return f"✅ Output:\n{result.stdout}"
        else:
            return f"❌ Compilation Failed:\n{result.stderr or result.stdout}"

    except subprocess.TimeoutExpired:
        return "❌ Error: Compilation timed out."
    except FileNotFoundError:
        return "❌ Error: Compiler executable not found."
    except Exception as e:
        return f"❌ Error:\nUnexpected error: {str(e)}"
