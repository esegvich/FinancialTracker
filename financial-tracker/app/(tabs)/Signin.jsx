import React, { useState } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    ScrollView,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../fireconfig';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'expo-router';

const { height } = Dimensions.get('window');
const db = getFirestore();

export default function SignIn() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignIn = async () => {
        try {
            setIsLoading(true);
            setError('');

            if (!username.trim()) {
                setError('Username is required');
                return;
            }

            if (!password) {
                setError('Password is required');
                return;
            }

            const q = query(collection(db, 'usernames'), where('username', '==', username));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError('Username not found');
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const emailFromUsername = userDoc.data().email;

            await signInWithEmailAndPassword(auth, emailFromUsername, password);
            router.replace('/HomeScreen');
        } catch (error) {
            console.error('Login Error', error);

            if (error.code === 'auth/wrong-password') setError('Incorrect password');
            else if (error.code === 'auth/invalid-email') setError('Invalid email format');
            else if (error.code === 'auth/user-not-found') setError('User not found');
            else if (error.code === 'auth/too-many-requests') setError('Too many attempts. Try again later.');
            else setError('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Finova</Text>
                <Text style={styles.welcomeText}>Welcome Back</Text>
            </View>

            {/* Main layout */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.whiteSheet}>
                        <Text style={styles.loginTitle}>Sign In</Text>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <TextInput
                            style={styles.input}
                            placeholder="Username"
                            placeholderTextColor="#999"
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            value={username}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#999"
                            onChangeText={setPassword}
                            secureTextEntry
                            value={password}
                        />

                        <TouchableOpacity
                            style={styles.signInButton}
                            onPress={handleSignIn}
                            disabled={isLoading}
                        >
                            <Text style={styles.buttonText}>
                                {isLoading ? 'Signing In...' : 'Sign In'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => router.push('/Forgetpassword')}
                        >
                            <Text style={styles.linkText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Don't have an account?</Text>
                            <TouchableOpacity onPress={() => router.push('/Signup')}>
                                <Text style={[styles.footerText, styles.footerLink]}> Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#00D09E',
    },
    header: {
        padding: 20,
        paddingTop: 60,
        paddingBottom: 30,
    },
    scrollContent: {
        flexGrow: 1,
    },
    whiteSheet: {
        backgroundColor: '#F1FFF3',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 30,
        paddingHorizontal: 30,
        paddingBottom: 40,
        minHeight: height * 0.65,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#052224',
    },
    welcomeText: {
        fontSize: 18,
        color: '#052224',
        marginTop: 10,
    },
    loginTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#052224',
        marginBottom: 30,
        textAlign: 'center',
    },
    input: {
        height: 50,
        backgroundColor: 'white',
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 15,
        paddingHorizontal: 15,
        fontSize: 16,
        color: '#052224',
    },
    signInButton: {
        backgroundColor: '#00D09E',
        height: 50,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 15,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    linkButton: {
        alignSelf: 'center',
        marginTop: 10,
    },
    linkText: {
        color: '#0068FF',
        fontSize: 14,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 30,
    },
    footerText: {
        color: '#666',
        fontSize: 14,
    },
    footerLink: {
        color: '#0068FF',
        fontWeight: '600',
    },
    errorText: {
        color: '#FF3B30',
        textAlign: 'center',
        marginBottom: 15,
        fontSize: 14,
    },
});
