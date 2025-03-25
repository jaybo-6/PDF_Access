require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 5000;
const SECRET_KEY = process.env.SECRET_KEY;
const USERS = {
    grade_creator: "123",
    grade_approver: "123"
};
const blacklistedTokens = new Set();
const activePdfTokens = new Set(); // Track active PDF tokens

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://10.5.33.201:3000',
        'http://127.0.0.1:3000'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
const HOST = "0.0.0.0";

// MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: "No token provided" });

    // Check if token is blacklisted
    if (blacklistedTokens.has(token)) {
        return res.status(403).json({ message: "Token has been invalidated" });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Token expired or invalid" });
        req.user = user;
        next();
    });
};

// Login route
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!USERS[username] || USERS[username] !== password) {
        return res.status(401).json({ message: "Invalid username or password" });
    }

    // Generate JWT token with short expiry
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "10m" });

    res.json({ token, username });
});

// Logout route - for explicit logout
app.post("/logout", (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        blacklistedTokens.add(token); // Add token to blacklist
        // Clear any associated PDF tokens on logout
        activePdfTokens.forEach((pdfToken) => {
            if (pdfToken.mainToken === token) {
                activePdfTokens.delete(pdfToken);
            }
        });
    }

    res.json({ message: "Logged out successfully" });
});

// Get document list as per user role
app.get("/documents", authenticateToken, (req, res) => {
    const { username } = req.user;
    let query;
    
    if (username === "grade_creator") {
        query = `
            SELECT 
                doc_id, 
                doc_title, 
                doc_file_name, 
                department_name, 
                created_date
            FROM document_access 
            WHERE 
                approver_name1 = 'Grade Creator' OR 
                approver_name2 = 'Grade Creator' OR 
                approver_name3 = 'Grade Creator' OR 
                approver_name4 = 'Grade Creator'
        `;
    } else if (username === "grade_approver") {
        query = `
            SELECT 
                doc_id, 
                doc_title, 
                doc_file_name, 
                department_name, 
                created_date
            FROM document_access 
            WHERE 
                approver_name1 = 'Grade_approver' OR 
                approver_name2 = 'Grade_approver' OR 
                approver_name3 = 'Grade_approver' OR 
                approver_name4 = 'Grade_approver'
        `;
    } else {
        return res.status(403).json({ message: "Unauthorized role" });
    }

    pool.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching documents:", err);
            return res.status(500).json({ message: "Database query failed", error: err.message });
        }

        const documents = results.map(doc => ({
            ...doc,
            created_date: doc.created_date 
                ? `${doc.created_date.getDate().toString().padStart(2, '0')}/${(doc.created_date.getMonth() + 1).toString().padStart(2, '0')}/${doc.created_date.getFullYear()}` 
                : null
        }));

        res.json(documents);
    });
});

// Generate secure temporary token for PDF viewing
app.post("/generate-pdf-token", authenticateToken, (req, res) => {
    const { docId } = req.body;
    const { username } = req.user;
    const mainToken = req.headers['authorization'].split(' ')[1];
    
    // First verify the user  access to this document
    let query;
    
    if (username === "grade_creator") {
        query = `
            SELECT doc_id FROM document_access 
            WHERE 
                doc_id = ? AND (
                    approver_name1 = 'Grade Creator' OR 
                    approver_name2 = 'Grade Creator' OR 
                    approver_name3 = 'Grade Creator' OR 
                    approver_name4 = 'Grade Creator'
                )
        `;
    } else if (username === "grade_approver") {
        query = `
            SELECT doc_id FROM document_access 
            WHERE 
                doc_id = ? AND (
                    approver_name1 = 'Grade_approver' OR 
                    approver_name2 = 'Grade_approver' OR 
                    approver_name3 = 'Grade_approver' OR 
                    approver_name4 = 'Grade_approver'
                )
        `;
    } else {
        return res.status(403).json({ message: "Unauthorized role" });
    }
    
    pool.query(query, [docId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: "Database query failed", error: err.message });
        }
        
        if (results.length === 0) {
            return res.status(403).json({ message: "You don't have access to this document" });
        }
        
        // Generatetoken for PDF access 
        const pdfToken = jwt.sign({ 
            docId, 
            username, 
            tokenType: 'pdfAccess',
            timestamp: Date.now() 
        }, SECRET_KEY, { expiresIn: "5m" });
        
        // Store the PDF token with its main authentication token
        activePdfTokens.add({ 
            pdfToken, 
            mainToken, 
            docId, 
            createdAt: Date.now() 
        });
        
        res.json({ pdfToken });
    });
});

// Secure PDF viewing route
app.get("/pdf/:token", (req, res) => {
    const { token } = req.params;
    
    // Verify token
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Invalid or expired PDF token" });
        }
        
        // Extra security: Check if PDF token is in active tokens and matches
        const activePdfToken = Array.from(activePdfTokens).find(
            item => item.pdfToken === token
        );
        
        if (!activePdfToken) {
            return res.status(403).json({ message: "PDF token no longer valid" });
        }
        
        const { docId, username } = decoded;
        
        // Check user access to this PDF again 
        let query;
        
        if (username === "grade_creator") {
            query = `
                SELECT doc_file, doc_file_name FROM document_access 
                WHERE 
                    doc_id = ? AND (
                        approver_name1 = 'Grade Creator' OR 
                        approver_name2 = 'Grade Creator' OR 
                        approver_name3 = 'Grade Creator' OR 
                        approver_name4 = 'Grade Creator'
                    )
            `;
        } else if (username === "grade_approver") {
            query = `
                SELECT doc_file, doc_file_name FROM document_access 
                WHERE 
                    doc_id = ? AND (
                        approver_name1 = 'Grade_approver' OR 
                        approver_name2 = 'Grade_approver' OR 
                        approver_name3 = 'Grade_approver' OR 
                        approver_name4 = 'Grade_approver'
                    )
            `;
        } else {
            return res.status(403).json({ message: "Unauthorized role" });
        }
        
        pool.query(query, [docId], (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Failed to fetch PDF", error: err.message });
            }
            
            if (results.length === 0 || !results[0].doc_file) {
                return res.status(404).json({ message: "PDF not found or access denied" });
            }
            
            const pdfBuffer = results[0].doc_file;
            const pdfFileName = results[0].doc_file_name || `document_${docId}.pdf`;
            
            // Remove this specific PDF token after usage
            activePdfTokens.delete(activePdfToken);
            
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="${pdfFileName}"`);
            res.send(pdfBuffer);
        });
    });
});

// Start server
app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://10.5.33.201:${PORT}`);
});