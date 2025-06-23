A full-stack project that implements a **Mini C Compiler** capable of:

- Lexical Analysis (Flex)
- Syntax Analysis (Bison/Yacc)
- Semantic Analysis
- Intermediate Code Generation (ICG)
- Parse Tree visualization
- Web-based interface using **React** (frontend) and **FastAPI** (backend)


🚀 Features

✅ Header file recognition  
✅ Variable declarations and assignments  
✅ Arithmetic expressions (+, -, *, /)  
✅ `if`, `else`, `for` control structures  
✅ Support for `int`, `float`, `char`, constants  
✅ Tree-based Parse Representation  
✅ Intermediate Code Generation (Three Address Code)  
✅ Error handling and semantic checks  
✅ Input directly from web interface (no need for file uploads)

📦 Setup & Installation
🖥️ Backend
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --reload --app-dir backend

🌐 Frontend
# Navigate to frontend directory
cd frontend

# Install React dependencies
npm install

# Run React server
npm start

