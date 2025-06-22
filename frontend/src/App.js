"use client"

import { useState, useEffect } from "react"
import "./App.css"

export default function App() {
  const [code, setCode] = useState(`#include<stdio.h>
int main() {
  // Your C code goes here
  printf("Hello, World!\\n");
  return 0;
}`)
  const [output, setOutput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [executionTime, setExecutionTime] = useState(0)
  const [theme, setTheme] = useState("dark")
  const [fontSize, setFontSize] = useState(14)
  const [activeTab, setActiveTab] = useState("editor")
  const [savedFiles, setSavedFiles] = useState([])
  const [activePhase, setActivePhase] = useState("all")
  const [compilationStatus, setCompilationStatus] = useState(null)

  // Load saved files from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("c-compiler-files")
    if (saved) {
      setSavedFiles(JSON.parse(saved))
    }
  }, [])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  const checkCompilationSuccess = (rawOutput) => {
    // Check if parse tree exists - this is the key indicator of successful compilation
    const hasParseTree = rawOutput.includes("Inorder traversal of the Parse Tree is:")
    const hasPhase2 = rawOutput.includes("PHASE 2: SYNTAX ANALYSIS")
    
    return hasParseTree && hasPhase2
  }

  const parseCompilerOutput = (rawOutput) => {
    const phases = {
      lexical: { title: "PHASE 1: LEXICAL ANALYSIS", content: "", symbols: [] },
      syntax: { title: "PHASE 2: SYNTAX ANALYSIS", content: "", parseTree: "" },
      semantic: { title: "PHASE 3: SEMANTIC ANALYSIS", content: "" },
      intermediate: { title: "PHASE 4: INTERMEDIATE CODE GENERATION", content: "", code: [] },
    }

    const lines = rawOutput.split("\n")
    let currentPhase = null
    let inSymbolTable = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      if (line.includes("PHASE 1: LEXICAL ANALYSIS")) {
        currentPhase = "lexical"
        continue
      } else if (line.includes("PHASE 2: SYNTAX ANALYSIS")) {
        currentPhase = "syntax"
        inSymbolTable = false
        continue
      } else if (line.includes("PHASE 3: SEMANTIC ANALYSIS")) {
        currentPhase = "semantic"
        continue
      } else if (line.includes("PHASE 4: INTERMEDIATE CODE GENERATION")) {
        currentPhase = "intermediate"
        continue
      }

      if (currentPhase === "lexical") {
        if (line.includes("SYMBOL") && line.includes("DATATYPE")) {
          inSymbolTable = true
          continue
        }
        if (line.includes("_______")) continue

        if (inSymbolTable && line && !line.includes("PHASE")) {
          const parts = line.split("\t").filter((part) => part.trim())
          if (parts.length >= 3) {
            phases.lexical.symbols.push({
              symbol: parts[0] || "",
              datatype: parts[1] || "",
              type: parts[2] || "",
              line: parts[3] || "",
            })
          }
        }
      } else if (currentPhase === "syntax") {
        if (line.includes("Inorder traversal")) continue
        if (line && !line.includes("PHASE")) {
          phases.syntax.parseTree += line + " "
        }
      } else if (currentPhase === "semantic") {
        if (line && !line.includes("PHASE")) {
          phases.semantic.content += line + "\n"
        }
      } else if (currentPhase === "intermediate") {
        if (line && !line.includes("PHASE")) {
          phases.intermediate.code.push(line)
        }
      }
    }

    return phases
  }

  const parseErrorOutput = (rawOutput) => {
    const errors = []
    const warnings = []
    const lines = rawOutput.split("\n")

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      // Common error patterns
      if (trimmedLine.includes("error:") || trimmedLine.includes("Error:") || trimmedLine.includes("ERROR:")) {
        const errorMatch =
          trimmedLine.match(/.*?:(\d+):(\d+):\s*error:\s*(.+)/) ||
          trimmedLine.match(/.*?line\s+(\d+).*?error:\s*(.+)/) ||
          trimmedLine.match(/error:\s*(.+)/)

        if (errorMatch) {
          errors.push({
            line: errorMatch[1] || "Unknown",
            column: errorMatch[2] || "Unknown",
            message: errorMatch[3] || errorMatch[2] || errorMatch[1],
            type: "Syntax Error",
          })
        } else {
          errors.push({
            line: "Unknown",
            column: "Unknown",
            message: trimmedLine,
            type: "Compilation Error",
          })
        }
      }

      // Warning patterns
      else if (trimmedLine.includes("warning:") || trimmedLine.includes("Warning:")) {
        const warningMatch =
          trimmedLine.match(/.*?:(\d+):(\d+):\s*warning:\s*(.+)/) || trimmedLine.match(/warning:\s*(.+)/)

        if (warningMatch) {
          warnings.push({
            line: warningMatch[1] || "Unknown",
            column: warningMatch[2] || "Unknown",
            message: warningMatch[3] || warningMatch[1],
            type: "Warning",
          })
        }
      }

      // Missing bracket/parenthesis errors
      else if (trimmedLine.includes("expected") && (trimmedLine.includes("')'") || trimmedLine.includes("'}'"))) {
        errors.push({
          line: "Unknown",
          column: "Unknown",
          message: trimmedLine,
          type: "Syntax Error",
        })
      }
    }

    return { errors, warnings, rawOutput }
  }

  const handleCompile = async () => {
    setLoading(true)
    setOutput("")
    setError(false)
    setCompilationStatus(null)
    const startTime = performance.now()

    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"
      const response = await fetch(`${API_URL}/compile/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      })

      const result = await response.json()
      setOutput(result.output)

      // Check if compilation was successful based on parse tree presence
      const isSuccessful = checkCompilationSuccess(result.output)
      
      if (!isSuccessful || result.error) {
        setError(true)
        setCompilationStatus("error")
      } else {
        setError(false)
        setCompilationStatus("success")
      }
    } catch (err) {
      setOutput("❌ Connection Error: " + err.message)
      setError(true)
      setCompilationStatus("connection_error")
    } finally {
      setLoading(false)
      const endTime = performance.now()
      setExecutionTime((endTime - startTime) / 1000)
    }
  }

  const handleSave = () => {
    const fileName = prompt("Enter file name (without extension):", "program")
    if (fileName) {
      const newFile = {
        name: fileName,
        code: code,
        date: new Date().toISOString(),
      }

      const updatedFiles = [...savedFiles, newFile]
      setSavedFiles(updatedFiles)
      localStorage.setItem("c-compiler-files", JSON.stringify(updatedFiles))
      alert(`File "${fileName}.c" saved successfully!`)
    }
  }

  const handleLoad = (file) => {
    if (window.confirm(`Load "${file.name}.c"? Your current code will be replaced.`)) {
      setCode(file.code)
      setActiveTab("editor")
    }
  }

  const handleDownload = () => {
    const element = document.createElement("a")
    const file = new Blob([code], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = "program.c"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    alert("Code copied to clipboard!")
  }

  const handleNewFile = () => {
    if (code.trim() && !window.confirm("Current code will be cleared. Continue?")) {
      return
    }
    setCode(`#include <stdio.h>\n\nint main() {\n    // Your code here\n    return 0;\n}`)
  }

  const deleteFile = (index, fileName) => {
    if (window.confirm(`Delete "${fileName}.c"?`)) {
      const updatedFiles = savedFiles.filter((_, i) => i !== index)
      setSavedFiles(updatedFiles)
      localStorage.setItem("c-compiler-files", JSON.stringify(updatedFiles))
    }
  }

  const renderErrorOutput = () => {
    const errorData = parseErrorOutput(output)

    return (
      <div className="error-analysis">
        <div className="status-indicator">
          <span className="status-icon error">❌</span>
          <span className="status-text error">Compilation Failed</span>
        </div>

        <div className="compilation-failed-section">
          <div className="failed-header">
            <span className="failed-icon">🚫</span>
            <h4>Compilation Stopped</h4>
          </div>
          <div className="failed-message">
            <p>The compiler could not complete all phases due to syntax errors in your code.</p>
            <p>Parse tree generation failed, indicating syntax analysis could not proceed.</p>
          </div>
        </div>

        {errorData.errors.length > 0 && (
          <div className="error-section">
            <div className="error-header">
              <span className="error-icon">🚨</span>
              <h4>Detected Issues ({errorData.errors.length})</h4>
            </div>
            <div className="error-list">
              {errorData.errors.map((error, index) => (
                <div key={index} className="error-item">
                  <div className="error-badge">{error.type}</div>
                  <div className="error-details">
                    <div className="error-location">
                      {error.line !== "Unknown" && (
                        <span className="location-info">
                          Line {error.line}
                          {error.column !== "Unknown" && `, Column ${error.column}`}
                        </span>
                      )}
                    </div>
                    <div className="error-message">{error.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {errorData.warnings.length > 0 && (
          <div className="warning-section">
            <div className="warning-header">
              <span className="warning-icon">⚠️</span>
              <h4>Warnings ({errorData.warnings.length})</h4>
            </div>
            <div className="warning-list">
              {errorData.warnings.map((warning, index) => (
                <div key={index} className="warning-item">
                  <div className="warning-badge">{warning.type}</div>
                  <div className="warning-details">
                    <div className="warning-location">
                      {warning.line !== "Unknown" && (
                        <span className="location-info">
                          Line {warning.line}
                          {warning.column !== "Unknown" && `, Column ${warning.column}`}
                        </span>
                      )}
                    </div>
                    <div className="warning-message">{warning.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="raw-output-section">
          <div className="raw-output-header">
            <span className="terminal-icon">💻</span>
            <h4>Compiler Output</h4>
          </div>
          <pre className="raw-output">{errorData.rawOutput}</pre>
        </div>

        <div className="help-section">
          <div className="help-header">
            <span className="help-icon">💡</span>
            <h4>Common Fixes</h4>
          </div>
          <div className="help-content">
            <ul>
              <li>Check for missing closing brackets <code>{'}'}</code> or parentheses <code>{')'}</code></li>
              <li>Ensure all statements end with semicolons <code>;</code></li>
              <li>Verify proper nesting of control structures</li>
              <li>Check for balanced quotes and brackets</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  const renderCompilerOutput = () => {
    if (!output) return null

    // Check if compilation was successful based on parse tree presence
    const isSuccessful = checkCompilationSuccess(output)
    
    if (!isSuccessful || error || compilationStatus === "error") {
      return renderErrorOutput()
    }

    const phases = parseCompilerOutput(output)

    if (activePhase === "all") {
      return (
        <div className="compiler-phases">
          <div className="status-indicator">
            <span className="status-icon success">✅</span>
            <span className="status-text success">All Compilation Phases Completed Successfully</span>
          </div>

          {/* Phase 1: Lexical Analysis */}
          <div className="phase-section">
            <div className="phase-header">
              <span className="phase-number">1</span>
              <h4>Lexical Analysis</h4>
              <span className="phase-icon">🔍</span>
            </div>
            <div className="symbol-table">
              <div className="table-header">
                <div>Symbol</div>
                <div>Data Type</div>
                <div>Type</div>
                <div>Line</div>
              </div>
              {phases.lexical.symbols.map((symbol, index) => (
                <div key={index} className="table-row">
                  <div className="symbol-name">{symbol.symbol}</div>
                  <div className="symbol-datatype">{symbol.datatype}</div>
                  <div className="symbol-type">{symbol.type}</div>
                  <div className="symbol-line">{symbol.line}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Phase 2: Syntax Analysis */}
          <div className="phase-section">
            <div className="phase-header">
              <span className="phase-number">2</span>
              <h4>Syntax Analysis</h4>
              <span className="phase-icon">🌳</span>
            </div>
            <div className="parse-tree">
              <h5>Parse Tree (Inorder Traversal):</h5>
              <div className="tree-tokens">
                {phases.syntax.parseTree.split(",").map((token, index) => (
                  <span key={index} className="tree-token">
                    {token.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Phase 3: Semantic Analysis */}
          <div className="phase-section">
            <div className="phase-header">
              <span className="phase-number">3</span>
              <h4>Semantic Analysis</h4>
              <span className="phase-icon">✅</span>
            </div>
            <div className="semantic-result">
              <div className="success-message">
                <span className="check-icon">✓</span>
                {phases.semantic.content || "Semantic analysis completed with no errors"}
              </div>
            </div>
          </div>

          {/* Phase 4: Intermediate Code Generation */}
          <div className="phase-section">
            <div className="phase-header">
              <span className="phase-number">4</span>
              <h4>Intermediate Code Generation</h4>
              <span className="phase-icon">⚙️</span>
            </div>
            <div className="intermediate-code">
              {phases.intermediate.code.map((line, index) => (
                <div
                  key={index}
                  className={`code-line ${
                    line.includes("LABEL")
                      ? "label"
                      : line.includes("GOTO") || line.includes("JUMP")
                        ? "jump"
                        : line.includes("if")
                          ? "condition"
                          : "assignment"
                  }`}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    // Individual phase view
    const phase = phases[activePhase]
    if (!phase) return null

    return (
      <div className="single-phase">
        <div className="phase-header">
          <h4>{phase.title}</h4>
        </div>
        <pre className="phase-content">{phase.content}</pre>
      </div>
    )
  }

  return (
    <div className={`app ${theme}`}>
      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <div className="logo">
              <div className="logo-icon">{"</>"}</div>
            </div>
            <div className="header-text">
              <h1 className="title">Fast-C Lite</h1>
              <p className="subtitle">Professional C compiler with phase-by-phase analysis</p>
            </div>
          </div>
          <div className="header-right">
            <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <span className="theme-icon">{theme === "dark" ? "☀️" : "🌙"}</span>
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>
        </header>

        {/* Main Interface */}
        <div className="main-card">
          <div className="card-header">
            <div className="card-title">
              <span className="terminal-icon">⚡</span>
              <span>Code Editor & Compiler</span>
            </div>
            <div className="header-controls">
              <div className="font-size-control">
                <label>Font Size:</label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number.parseInt(e.target.value))}
                  className="font-select"
                >
                  {[12, 14, 16, 18, 20].map((size) => (
                    <option key={size} value={size}>
                      {size}px
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={handleCompile} disabled={loading} className={`run-button ${loading ? "loading" : ""}`}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <span className="play-icon">▶️</span>
                    Compile & Analyze
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="main-content">
            {/* Editor Panel */}
            <div className="editor-panel">
              <div className="panel-header">
                <h3 className="panel-title">
                  <span className="file-icon">📄</span>
                  Code Editor
                </h3>
                <div className="toolbar">
                  <button className="toolbar-btn" onClick={handleNewFile}>
                    <span className="btn-icon">📁</span>
                    New
                  </button>
                  <button className="toolbar-btn" onClick={handleSave}>
                    <span className="btn-icon">💾</span>
                    Save
                  </button>
                  <button className="toolbar-btn" onClick={handleDownload}>
                    <span className="btn-icon">⬇️</span>
                    Export
                  </button>
                  <button className="toolbar-btn" onClick={handleCopy}>
                    <span className="btn-icon">📋</span>
                    Copy
                  </button>
                </div>
              </div>

              <div className="tabs">
                <div className="tab-list">
                  <button
                    className={`tab ${activeTab === "editor" ? "active" : ""}`}
                    onClick={() => setActiveTab("editor")}
                  >
                    Editor
                  </button>
                  <button
                    className={`tab ${activeTab === "files" ? "active" : ""}`}
                    onClick={() => setActiveTab("files")}
                  >
                    Saved Files ({savedFiles.length})
                  </button>
                </div>

                <div className="tab-content">
                  {activeTab === "editor" ? (
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="code-editor"
                      style={{ fontSize: `${fontSize}px` }}
                      spellCheck={false}
                      placeholder="Write your C code here..."
                    />
                  ) : (
                    <div className="saved-files">
                      {savedFiles.length === 0 ? (
                        <div className="empty-state">
                          <div className="empty-icon">📁</div>
                          <p>No saved files yet</p>
                          <p className="empty-subtitle">Save your code to see it here</p>
                        </div>
                      ) : (
                        <div className="file-list">
                          {savedFiles.map((file, index) => (
                            <div key={index} className="file-item">
                              <div className="file-content" onClick={() => handleLoad(file)}>
                                <div className="file-name">
                                  <span className="code-icon">💻</span>
                                  {file.name}.c
                                </div>
                                <div className="file-date">{new Date(file.date).toLocaleString()}</div>
                              </div>
                              <button
                                className="delete-btn"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteFile(index, file.name)
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Output Panel */}
            <div className="output-panel">
              <div className="panel-header">
                <h3 className="panel-title">
                  <span className="terminal-icon">💻</span>
                  Compiler Analysis
                </h3>
                <div className="output-controls">
                  {executionTime > 0 && (
                    <div className="execution-time">
                      <span className="clock-icon">⏱️</span>
                      {executionTime.toFixed(2)}s
                    </div>
                  )}
                  {output && !error && checkCompilationSuccess(output) && (
                    <select
                      value={activePhase}
                      onChange={(e) => setActivePhase(e.target.value)}
                      className="phase-select"
                    >
                      <option value="all">All Phases</option>
                      <option value="lexical">Lexical Analysis</option>
                      <option value="syntax">Syntax Analysis</option>
                      <option value="semantic">Semantic Analysis</option>
                      <option value="intermediate">Intermediate Code</option>
                    </select>
                  )}
                </div>
              </div>

              <div className={`output-container ${error || (output && !checkCompilationSuccess(output)) ? "error" : ""}`}>
                {loading ? (
                  <div className="loading-state">
                    <div className="loading-content">
                      <div className="spinner large"></div>
                      <p>Compiling and analyzing code...</p>
                      <p className="loading-subtitle">Running through all compiler phases</p>
                    </div>
                  </div>
                ) : output ? (
                  renderCompilerOutput()
                ) : (
                  <div className="empty-output">
                    <div className="empty-icon">🔬</div>
                    <p>Compiler analysis will appear here</p>
                    <p className="empty-subtitle">
                      Run your code to see lexical, syntax, semantic, and intermediate code analysis
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="footer">
          <p className="footer-title">by Shivansh Vashisth</p>
          <p className="footer-subtitle">Analyze your C code through all compiler phases with detailed insights</p>
          <div className="backend-status">Backend Required: http://127.0.0.1:8000</div>
        </footer>
      </div>
    </div>
  )
}
