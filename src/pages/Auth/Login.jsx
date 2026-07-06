import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { auth, db, googleProvider } from "../../firebase";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";

const ACCESS_DENIED_KEY = "hp_access_denied";

/**
 * Checks if the given email exists in the Firestore "users" collection.
 * Returns the matching user document data if found, or null otherwise.
 * Throws on any error to enforce security (never bypass).
 */
async function findWhitelistedUser(email) {
  if (!email) return null;
  const q = query(
    collection(db, "users"),
    where("email", "==", email.toLowerCase()),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

export default function Login() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // Show access denied toast if redirected here after a whitelist failure
  useEffect(() => {
    const denied = sessionStorage.getItem(ACCESS_DENIED_KEY);
    if (denied) {
      sessionStorage.removeItem(ACCESS_DENIED_KEY);
      addToast({
        type: "error",
        title: "Access Denied",
        message: "Please contact the administrator.",
      });
    }
  }, [addToast]);

/**
    * After Firebase Auth succeeds, verify the user's email against the
    * Firestore "users" whitelist. If not found → sign out + toast.
    * If disabled → sign out + toast.
    * If found → merge auth metadata into the user doc and navigate home.
    * Network failures will throw and be caught below - security never bypassed.
    */
  const verifyAndProceed = async (firebaseUser) => {
    const whitelisted = await findWhitelistedUser(firebaseUser.email);

    if (!whitelisted) {
      await signOut(auth);
      addToast({
        type: "error",
        title: "Access Denied",
        message: "Please contact the administrator.",
      });
      return;
    }

    // Disabled users cannot access the application
    if (whitelisted.active === false) {
      await signOut(auth);
      addToast({
        type: "error",
        title: "Account Disabled",
        message: "Your account has been disabled. Please contact the administrator.",
      });
      return;
    }

    // Merge latest auth metadata into the existing user document
    await setDoc(
      doc(db, "users", whitelisted.id),
      {
        uid: firebaseUser.uid,
        displayName:
          firebaseUser.displayName || whitelisted.displayName || "",
        email: firebaseUser.email || whitelisted.email || "",
        photoURL: firebaseUser.photoURL || whitelisted.photoURL || "",
        role: whitelisted.role || "admin",
      },
      { merge: true },
    );

    addToast({
      type: "success",
      title: "Signed In",
      message: "Welcome to Digi Moi.",
    });
    navigate("/");
  };

  // ── Email / Password Sign-In ──
  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setIsSubmitting(true);

    try {
      const result = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      await verifyAndProceed(result.user);
    } catch (error) {
      // If the auth itself failed, show the Firebase error
      addToast({
        type: "error",
        title: "Sign-In Failed",
        message: error.message || "Unable to sign in. Check your credentials.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Google Sign-In ──
  const handleGoogleSignIn = async () => {
    setIsGoogleSubmitting(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      await verifyAndProceed(result.user);
    } catch (error) {
      addToast({
        type: "error",
        title: "Google Sign-In Failed",
        message: error.message || "Unable to sign in with Google.",
      });
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-[var(--card)] p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Sign in to continue managing your wedding events.
          </p>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label
              htmlFor="loginEmail"
              className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Email
            </label>
            <Input
              id="loginEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="loginPassword"
              className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <Input
              id="loginPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isSubmitting}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isSubmitting}
          >
            Sign In
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">
            or
          </span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Google Sign-In */}
        <Button
          onClick={handleGoogleSignIn}
          variant="outline"
          className="w-full"
          isLoading={isGoogleSubmitting}
        >
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
