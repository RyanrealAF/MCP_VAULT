
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, query, where, updateDoc, doc } from "firebase/firestore";
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// --- IMPORTANT ---
// Paste your Firebase project configuration here.
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("❌ Firebase configuration is missing. Please edit bridge.ts and add your project config.");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'idx-bridge-relay';

console.log("🚀 Secure IDX Bridge Active. Awaiting commands from Cloud...");

const q = query(
  collection(db, 'artifacts', APP_ID, 'public', 'data', 'commands'),
  where("status", "==", "pending")
);

onSnapshot(q, async (snapshot) => {
  for (const change of snapshot.docChanges()) {
    if (change.type === "added") {
      const commandDoc = change.doc;
      const { action, projectName, deploy } = commandDoc.data();
      
      try {
        if (action !== "FORGE_PROJECT") {
          throw new Error(`Forbidden action: ${action}. Only 'FORGE_PROJECT' is allowed.`);
        }

        if (!projectName) {
            throw new Error('Missing required parameter: projectName');
        }

        const deployFlag = deploy === false ? '--no-deploy' : ''; // Deploy by default if 'deploy' is not explicitly false
        const command = `node forge.ts ${projectName} ${deployFlag}`;

        console.log(`Executing: ${command}`);
        const { stdout, stderr } = await execAsync(command);

        if (stderr) {
          console.warn(`Execution produced stderr (this may be informational): ${stderr}`);
        }
        
        const output = stdout || 'Execution completed successfully.';
        console.log(`✅ Executed: ${action} on project ${projectName}`);
        
        await updateDoc(commandDoc.ref, {
          status: "completed",
          result: output,
          completedAt: Date.now()
        });

      } catch (e: any) {
        console.error(`❌ Command failed: ${e.message}`);
        await updateDoc(commandDoc.ref, {
          status: "error",
          result: e.message
        });
      }
    }
  }
});
