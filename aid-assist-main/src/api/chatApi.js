// src/api/chatApi.js
export async function sendMessageToBackend(message) {
  const response = await fetch("http://127.0.0.1:8000/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error("Backend error: " + response.statusText);
  }

  return response.json();
}
