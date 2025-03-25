import React, { useEffect, useState } from "react";
import axios from "axios";

const PdfList = ({ user, onLogout }) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    onLogout();
                    return;
                }

                const response = await axios.get("http://10.5.33.201:5000/documents", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                
                setDocuments(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching documents:", error);
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    alert("Your session has expired. Please log in again.");
                    onLogout();
                } else {
                    setError("Failed to load documents. Please try again later.");
                    setLoading(false);
                }
            }
        };

        fetchDocuments();
    }, [user, onLogout]);

    const handleViewPdf = async (docId) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                onLogout();
                return;
            }

            // Get a temporary token for this specific PDF
            const tokenResponse = await axios.post("http://10.5.33.201:5000/generate-pdf-token", 
                { docId },
                { headers: { Authorization: `Bearer ${token}` }}
            );

            // Open PDF in new window using the temporary token
            window.open(`http://10.5.33.201:5000/pdf/${tokenResponse.data.pdfToken}`, '_blank');
        } catch (error) {
            console.error("Error viewing PDF:", error);
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                alert("Your session has expired. Please log in again.");
                onLogout();
            } else {
                alert("Failed to view PDF. Please try again later.");
            }
        }
    };

    if (loading) {
        return <div>Loading documents...</div>;
    }

    if (error) {
        return <div style={{ color: "red" }}>{error}</div>;
    }

    return (
        <div style={{ padding: "10px", width: "100%", overflowX: "auto" }}>
            <h2>Documents for {user}</h2>
            
            {documents.length === 0 ? (
                <p>No documents available for your role.</p>
            ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ backgroundColor: "#f1f1f1" }}>
                            <th style={headerStyle}>Doc ID</th>
                            <th style={headerStyle}>Title</th>
                            <th style={headerStyle}>File Name</th>
                            <th style={headerStyle}>Department</th>
                            <th style={headerStyle}>Created Date</th>
                            <th style={headerStyle}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {documents.map((doc) => (
                            <tr key={doc.doc_id} style={{ borderBottom: "1px solid #ddd" }}>
                                <td style={cellStyle}>{doc.doc_id}</td>
                                <td style={cellStyle}>{doc.doc_title}</td>
                                <td style={cellStyle}>{doc.doc_file_name}</td>
                                <td style={cellStyle}>{doc.department_name}</td>
                                <td style={cellStyle}>{doc.created_date}</td>
                                <td style={cellStyle}>
                                    <button 
                                        onClick={() => handleViewPdf(doc.doc_id)} 
                                        style={buttonStyle}
                                    >
                                        View PDF
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

const headerStyle = {
    padding: "8px",
    textAlign: "left",
    borderBottom: "1px solid #ddd",
    backgroundColor: "#f1f1f1"
};

const cellStyle = {
    padding: "8px",
    borderBottom: "1px solid #ddd"
};

const buttonStyle = {
    backgroundColor: "#4CAF50",
    border: "none",
    color: "white",
    padding: "6px 10px",
    textAlign: "center",
    textDecoration: "none",
    display: "inline-block",
    fontSize: "12px",
    margin: "2px",
    cursor: "pointer"
};

export default PdfList;