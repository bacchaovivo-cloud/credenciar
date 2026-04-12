import jwt from 'jsonwebtoken';
import { env } from './src/backend/config/env.js';

// 🛡️ SSRF PATTERN TEST
const PRIVATE_IP_PATTERN = /^(localhost|127\.|0\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/i;

const testUrls = [
    { url: 'https://google.com', expected: false }, // Should not match (Safe)
    { url: 'http://localhost:3000', expected: true }, // Should match (Unsafe)
    { url: 'http://127.0.0.1/admin', expected: true },
    { url: 'http://169.254.169.254/latest/meta-data', expected: true },
    { url: 'http://192.168.1.1', expected: true },
    { url: 'http://10.0.0.5', expected: true },
    { url: 'https://bacch.com.br', expected: false }
];

console.log('--- 🛡️ SSRF PATTERN TEST ---');
testUrls.forEach(t => {
    const url = new URL(t.url);
    const isPrivate = PRIVATE_IP_PATTERN.test(url.hostname);
    const result = isPrivate === t.expected ? '✅ pass' : '❌ fail';
    console.log(`${result} | ${t.url} | Detected Private: ${isPrivate}`);
});

// 🩺 HEALTH AUTH TEST
console.log('\n--- 🩺 HEALTH AUTH TEST ---');
const adminToken = jwt.sign({ id: 1, role: 'ADMIN' }, env.JWT_SECRET);
const staffToken = jwt.sign({ id: 2, role: 'STAFF' }, env.JWT_SECRET);

function simulateHealthCheck(token) {
    let isAdmin = false;
    if (token) {
        try {
            const decoded = jwt.verify(token, env.JWT_SECRET);
            if (decoded.role === 'ADMIN') isAdmin = true;
        } catch (err) {}
    }
    return isAdmin ? 'Detailed Report (Allowed)' : 'Basic Status (Restricted)';
}

console.log('Anonymous:', simulateHealthCheck(null));
console.log('Staff User:', simulateHealthCheck(staffToken));
console.log('Admin User:', simulateHealthCheck(adminToken));
