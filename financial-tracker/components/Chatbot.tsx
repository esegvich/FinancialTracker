import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    ActionSheetIOS
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { MaterialIcons } from '@expo/vector-icons';

const apiKey = "" // ADD API KEY HERE
const { height } = Dimensions.get('window');

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
}

interface ChatbotProps {
    onClose?: () => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ onClose }) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'Hello! I\'m your budget assistant. How can I help you today?',
            isUser: false,
            timestamp: new Date(),
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const viewRef = useRef<View>(null);

    const sendMessage = async () => {
        if (!inputText.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputText.trim(),
            isUser: true,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            const response = await callAIAPI(inputText.trim());

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: response,
                isUser: false,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Error calling AI API:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: 'Sorry, I encountered an error. Please try again later.',
                isUser: false,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    };

    const callAIAPI = async (message: string): Promise<string> => {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful budget and financial assistant. Keep responses focused on budgeting, saving, and financial planning.'
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 500,
            }),
        });

        const data = await response.json();
        return data.choices[0].message.content;
    };

    const renderMessage = (message: Message) => (
        <View
            key={message.id}
            style={[
                styles.messageContainer,
                message.isUser ? styles.userMessage : styles.botMessage,
            ]}
        >
            <Text
                style={[
                    styles.messageText,
                    message.isUser ? styles.userMessageText : styles.botMessageText,
                ]}
            >
                {message.text}
            </Text>
            <Text style={styles.timestamp}>
                {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                })}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Budget Bot</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity onPress={() => {}} style={styles.exportButton}>
                        <MaterialIcons name="file-download" size={24} color="white" />
                    </TouchableOpacity>
                    {onClose && (
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>×</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <KeyboardAwareScrollView
                extraScrollHeight={90}
                enableOnAndroid
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flexGrow: 1 }}
                style={{ flex: 1 }}
            >

                <View style={styles.whiteSheet}>

                    <View style={styles.messagesContainer}>
                        {messages.map(renderMessage)}
                        {isLoading && (
                            <View style={[styles.messageContainer, styles.botMessage]}>
                                <Text style={styles.loadingText}>Typing...</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.inputContainerWrapper}>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.textInput}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="Ask me about budgeting..."
                                multiline
                            />

                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    inputText.trim() !== '' && styles.sendButtonActive
                                ]}
                                onPress={sendMessage}
                                disabled={!inputText.trim()}
                            >
                                <Text
                                    style={[
                                        styles.sendButtonText,
                                        inputText.trim() !== '' && styles.sendButtonTextActive
                                    ]}
                                >
                                    Send
                                </Text>
                            </TouchableOpacity>

                        </View>
                    </View>

                </View>
            </KeyboardAwareScrollView>
        </View>
    );

};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#00D09E',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        backgroundColor: '#00D09E',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#052224',
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    exportButton: {
        marginRight: 15,
    },
    closeButton: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 24,
        color: 'white',
        fontWeight: 'bold',
    },
    whiteSheet: {
        flex: 1,
        marginTop: height * 0.30,
        backgroundColor: '#F1FFF3',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingBottom: 16,
    },
    messagesContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    messagesContentContainer: {
        paddingTop: 20,
        paddingBottom: 80,
    },
    messageContainer: {
        marginVertical: 6,
        padding: 12,
        borderRadius: 16,
        maxWidth: '80%',
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#00D09E',
    },
    botMessage: {
        alignSelf: 'flex-start',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    userMessageText: {
        color: 'white',
    },
    botMessageText: {
        color: '#052224',
    },
    timestamp: {
        fontSize: 10,
        color: '#888',
        marginTop: 4,
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        fontStyle: 'italic',
    },
    inputContainerWrapper: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#00D09E',
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginBottom: 80,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#052224',
    },
    sendButton: {
        marginLeft: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#ccc',
    },
    sendButtonActive: {
        backgroundColor: '#00D09E',
    },
    sendButtonText: {
        color: '#888',
        fontWeight: 'bold',
    },
    sendButtonTextActive: {
        color: 'white',
    },
});

export default Chatbot;