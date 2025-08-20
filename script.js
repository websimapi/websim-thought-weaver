const dom = {
    promptsContainer: document.getElementById('prompts-container'),
    superPromptBtn: document.getElementById('super-prompt-btn'),
    inputForm: document.getElementById('input-form'),
    promptInput: document.getElementById('prompt-input'),
    micBtn: document.getElementById('mic-btn'),
    statusIndicator: document.getElementById('status-indicator'),
    toast: document.getElementById('toast'),
};

let prompts = [];
let conversationHistory = [];
let isListening = false;
let recognition;

const systemPrompts = {
    thoughtWeaver: `You are a 'Thought Weaver' AI. Your task is to listen to the user's raw thoughts, ideas, or conversations and transform them into well-structured, effective prompts for other AI systems (like image generators, text models, etc.). The user might be rambling or unclear. Your job is to distill their intent into a concise and actionable prompt. The prompt should be creative and evocative. Respond ONLY with the generated prompt text, nothing else.`,
    promptSynthesizer: `You are a 'Prompt Synthesizer' AI. The user has provided a list of previously generated prompts. Your task is to analyze these prompts and combine their core themes and ideas into a single, complex 'super prompt'. This new prompt should be a creative synthesis of the previous concepts, weaving them together into a coherent and imaginative scene or idea. Respond ONLY with the generated super prompt, nothing else.`
};

function setupSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!window.SpeechRecognition) {
        dom.micBtn.disabled = true;
        dom.statusIndicator.textContent = 'Speech recognition not supported.';
        return;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isListening = true;
        dom.micBtn.classList.add('listening');
        dom.statusIndicator.textContent = 'Listening...';
        dom.promptInput.placeholder = 'Listening...';
    };

    recognition.onend = () => {
        isListening = false;
        dom.micBtn.classList.remove('listening');
        dom.statusIndicator.textContent = 'Idle';
         dom.promptInput.placeholder = 'Start by typing or use the mic...';
    };

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('');
        dom.promptInput.value = transcript;

        if (event.results[0].isFinal) {
            processInput(transcript);
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        dom.statusIndicator.textContent = 'Speech recognition error.';
    };
}

function toggleListening() {
    if (!recognition) return;
    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

function renderPrompts() {
    if (prompts.length === 0) {
        dom.promptsContainer.innerHTML = '<div class="placeholder">Your generated prompts will appear here. Click a prompt to copy it.</div>';
        dom.superPromptBtn.disabled = true;
        return;
    }

    dom.promptsContainer.innerHTML = '';
    prompts.forEach(promptText => {
        const card = document.createElement('div');
        card.className = 'prompt-card';
        card.textContent = promptText;
        card.addEventListener('click', () => copyToClipboard(promptText));
        dom.promptsContainer.appendChild(card);
    });
    
    dom.superPromptBtn.disabled = prompts.length < 2;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        dom.toast.classList.add('show');
        setTimeout(() => {
            dom.toast.classList.remove('show');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

async function processInput(text) {
    if (!text.trim()) return;

    dom.statusIndicator.textContent = 'Weaving thought...';
    dom.promptInput.value = '';
    dom.promptInput.disabled = true;
    
    conversationHistory.push({ role: 'user', content: text });

    try {
        const completion = await websim.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompts.thoughtWeaver },
                ...conversationHistory.slice(-5) 
            ],
        });
        
        const newPrompt = completion.content;
        prompts.push(newPrompt);
        conversationHistory.push({ role: 'assistant', content: newPrompt });
        renderPrompts();

    } catch (error) {
        console.error('AI completion error:', error);
        dom.statusIndicator.textContent = 'Error weaving prompt.';
    } finally {
        dom.statusIndicator.textContent = 'Idle';
        dom.promptInput.disabled = false;
        dom.promptInput.focus();
    }
}

async function generateSuperPrompt() {
    if (prompts.length < 2) return;

    dom.statusIndicator.textContent = 'Weaving a super prompt...';
    dom.superPromptBtn.disabled = true;
    
    const combinedPrompts = "Here are the previous prompts:\n\n" + prompts.join('\n- ');

    try {
        const completion = await websim.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompts.promptSynthesizer },
                { role: 'user', content: combinedPrompts }
            ],
        });
        const superPrompt = completion.content;
        prompts.push(superPrompt);
        renderPrompts();
        
        // Highlight the new super prompt
        const lastCard = dom.promptsContainer.lastChild;
        if(lastCard) {
            lastCard.style.borderColor = 'var(--secondary-color)';
            lastCard.style.boxShadow = `0 4px 20px rgba(52, 152, 219, 0.4)`;
        }

    } catch (error) {
        console.error('Super prompt generation error:', error);
        dom.statusIndicator.textContent = 'Error weaving super prompt.';
    } finally {
        dom.statusIndicator.textContent = 'Idle';
        dom.superPromptBtn.disabled = prompts.length < 2;
    }
}


function init() {
    setupSpeechRecognition();
    renderPrompts();

    dom.micBtn.addEventListener('click', toggleListening);
    dom.inputForm.addEventListener('submit', (e) => {
        e.preventDefault();
        processInput(dom.promptInput.value);
    });
    dom.superPromptBtn.addEventListener('click', generateSuperPrompt);
}

init();

