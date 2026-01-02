// Telegram Bot Configuration
const TELEGRAM_CONFIG = {
    BOT_USERNAME: 'remontpro_bot',
    BOT_TOKEN: '7705674023:AAFxU_5D2BzADFvQrqWRI-DFYdNuFJRM4mU',
    CHAT_IDS: {
        ADMIN: '5238611270', // ✅ ВАШ РЕАЛЬНЫЙ CHAT ID!
        NOTIFICATIONS: '' // Можно оставить пустым пока
    },
    API_URL: 'https://api.telegram.org/bot'
};
// State management
let appState = {
    currentRepairType: null,
    userData: {
        name: '',
        phone: '',
        area: '',
        type: '',
        budget: ''
    },
    calculationStep: 0
};

// DOM Elements
const DOM = {
    // Modal elements
    modal: document.getElementById('telegramModal'),
    closeModal: document.getElementById('modalClose'),
    
    // Buttons
    telegramFloatBtn: document.getElementById('telegramBtn'),
    headerCalcBtn: document.getElementById('headerCalcBtn'),
    heroCalcBtn: document.getElementById('heroCalcBtn'),
    mainCalcBtn: document.getElementById('mainCalcBtn'),
    finalCalcBtn: document.getElementById('finalCalcBtn'),
    morePortfolioBtn: document.getElementById('morePortfolioBtn'),
    portfolioBtn: document.getElementById('portfolioBtn'),
    
    // Forms
    contactForm: document.getElementById('contactForm'),
    calculationForm: null,
    
    // Other
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    nav: document.querySelector('.nav'),
    
    // Price cards
    priceCards: document.querySelectorAll('[data-type]')
};

// Telegram API Functions
const TelegramAPI = {
    // Отправка сообщения через бота
    async sendMessage(chatId, text, parseMode = 'HTML') {
        try {
            const url = `${TELEGRAM_CONFIG.API_URL}${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: text,
                    parse_mode: parseMode,
                    disable_web_page_preview: true
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Telegram API Error:', error);
            this.sendFallbackMessage(chatId, text);
        }
    },
    
    // Отправка сообщения с inline-кнопками
    async sendMessageWithButtons(chatId, text, buttons) {
        try {
            const url = `${TELEGRAM_CONFIG.API_URL}${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: text,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: buttons
                    }
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Telegram API Error:', error);
        }
    },
    
    // Резервный метод отправки через ссылку
    sendFallbackMessage(chatId, text) {
        const encodedText = encodeURIComponent(text);
        const telegramUrl = `https://t.me/share/url?url=https://t.me/${TELEGRAM_CONFIG.BOT_USERNAME}&text=${encodedText}`;
        window.open(telegramUrl, '_blank');
    },
    
    // Отправка заявки администратору
    async sendApplicationToAdmin(formData) {
        const message = `
🏠 <b>НОВА ЗАЯВКА З САЙТУ</b>

👤 <b>Ім'я:</b> ${formData.name}
📞 <b>Телефон:</b> ${formData.phone}
📐 <b>Площа:</b> ${formData.area || 'Не вказано'}
🔧 <b>Тип ремонту:</b> ${formData.type || 'Не вказано'}
💰 <b>Бюджет:</b> ${formData.budget || 'Не вказано'}

💬 <b>Повідомлення:</b>
${formData.message || 'Не залишено'}

🕒 <b>Час:</b> ${new Date().toLocaleString('uk-UA')}
🌐 <b>Джерело:</b> Сайт РемонтПро
        `;
        
        // Кнопки для быстрого ответа
        const buttons = [
            [
                {
                    text: "📞 Подзвонити",
                    url: `tel:${formData.phone}`
                },
                {
                    text: "✍️ Написати",
                    url: `https://t.me/${formData.phone.replace('+', '')}`
                }
            ],
            [
                {
                    text: "✅ Прийняти в роботу",
                    callback_data: `accept_${Date.now()}`
                },
                {
                    text: "📋 Додати в CRM",
                    callback_data: `crm_${Date.now()}`
                }
            ]
        ];
        
        await this.sendMessageWithButtons(TELEGRAM_CONFIG.CHAT_IDS.ADMIN, message, buttons);
        
        // Отправляем также в канал уведомлений если указан
        if (TELEGRAM_CONFIG.CHAT_IDS.NOTIFICATIONS) {
            await this.sendMessage(TELEGRAM_CONFIG.CHAT_IDS.NOTIFICATIONS, message);
        }
    },
    
    // Отправка уведомления о расчете
    async sendCalculationNotification(formData) {
        const message = `
🧮 <b>НОВИЙ РОЗРАХУНОК З САЙТУ</b>

📐 <b>Площа:</b> ${formData.area} м²
🔧 <b>Тип ремонту:</b> ${formData.type}
💰 <b>Бюджет:</b> ${formData.budget}

👤 <b>Контакт:</b> ${formData.phone || 'Не залишено'}

🕒 <b>Час:</b> ${new Date().toLocaleString('uk-UA')}
        `;
        
        await this.sendMessage(TELEGRAM_CONFIG.CHAT_IDS.ADMIN, message);
    }
};

// Modal Management
const ModalManager = {
    init() {
        // Открытие модального окна
        [DOM.telegramFloatBtn, DOM.headerCalcBtn, DOM.heroCalcBtn, DOM.mainCalcBtn, DOM.finalCalcBtn].forEach(btn => {
            if (btn) btn.addEventListener('click', () => this.openModal());
        });
        
        // Закрытие модального окна
        if (DOM.closeModal) {
            DOM.closeModal.addEventListener('click', () => this.closeModal());
        }
        
        // Закрытие при клике вне модалки
        if (DOM.modal) {
            DOM.modal.addEventListener('click', (e) => {
                if (e.target === DOM.modal) this.closeModal();
            });
        }
        
        // Закрытие на Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && DOM.modal.classList.contains('active')) {
                this.closeModal();
            }
        });
    },
    
    openModal(repairType = null) {
        if (repairType) {
            appState.currentRepairType = repairType;
            this.updateModalContent(repairType);
        }
        
        DOM.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Автофокус на кнопку Telegram
        setTimeout(() => {
            const telegramBtn = document.querySelector('.modal-btn');
            if (telegramBtn) telegramBtn.focus();
        }, 300);
    },
    
    closeModal() {
        DOM.modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        appState.currentRepairType = null;
    },
    
    updateModalContent(repairType) {
        const modalBody = DOM.modal.querySelector('.modal-body');
        if (!modalBody) return;
        
        const repairTypes = {
            cosmetic: 'косметичний',
            capital: 'капітальний',
            premium: 'преміум'
        };
        
        const typeName = repairTypes[repairType] || 'обраний';
        
        modalBody.innerHTML = `
            <div class="modal-icon">
                <i class="fab fa-telegram-plane"></i>
            </div>
            <h4>Розрахунок ${typeName} ремонту</h4>
            <p>Зараз відкриється Telegram-бот, який допоможе розрахувати точну вартість вашого ремонту.</p>
            
            <div class="modal-features">
                <p><i class="fas fa-check-circle"></i> Миттєвий розрахунок</p>
                <p><i class="fas fa-check-circle"></i> Консультація фахівця</p>
                <p><i class="fas fa-check-circle"></i> Запис на безкоштовний замір</p>
            </div>
            
            <a href="https://t.me/${TELEGRAM_CONFIG.BOT_USERNAME}?start=from_site_${repairType}" 
               target="_blank" 
               class="btn-primary btn-xlarge modal-btn">
                <i class="fab fa-telegram-plane"></i> Перейти до бота в Telegram
            </a>
            
            <p class="modal-note">Після розрахунку наш менеджер зв'яжеться з вами протягом 15 хвилин</p>
            
            <div class="alternative-options">
                <p>Або зв'яжіться іншим способом:</p>
                <div class="alternative-buttons">
                    <a href="tel:+380631234567" class="btn-outline">
                        <i class="fas fa-phone"></i> Подзвонити
                    </a>
                    <a href="viber://chat?number=%2B380631234567" class="btn-outline">
                        <i class="fab fa-viber"></i> Viber
                    </a>
                </div>
            </div>
        `;
    }
};

// Form Handling
const FormManager = {
    init() {
        // Контактная форма
        if (DOM.contactForm) {
            DOM.contactForm.addEventListener('submit', (e) => this.handleContactForm(e));
        }
        
        // Форма расчета (будет создана динамически)
        this.initCalculationForm();
        
        // Price cards
        if (DOM.priceCards) {
            DOM.priceCards.forEach(card => {
                const button = card.querySelector('button');
                if (button) {
                    button.addEventListener('click', () => {
                        const type = card.getAttribute('data-type');
                        ModalManager.openModal(type);
                    });
                }
            });
        }
    },
    
    async handleContactForm(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        
        const data = {
            name: formData.get('name') || '',
            phone: formData.get('phone') || '',
            message: formData.get('message') || '',
            source: 'contact_form',
            timestamp: new Date().toISOString()
        };
        
        // Валидация
        if (!data.phone || data.phone.length < 10) {
            this.showNotification('Будь ласка, введіть коректний номер телефону', 'error');
            return;
        }
        
        try {
            // Показываем индикатор загрузки
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Відправка...';
            submitBtn.disabled = true;
            
            // Отправляем в Telegram
            await TelegramAPI.sendApplicationToAdmin(data);
            
            // Показываем успешное сообщение
            this.showNotification('Заявка успішно відправлена! Ми зв\'яжемося з вами протягом 15 хвилин.', 'success');
            
            // Очищаем форму
            form.reset();
            
            // Открываем Telegram
            setTimeout(() => {
                window.open(`https://t.me/${TELEGRAM_CONFIG.BOT_USERNAME}?start=contact_${Date.now()}`, '_blank');
            }, 1500);
            
        } catch (error) {
            console.error('Form submission error:', error);
            this.showNotification('Помилка відправки. Спробуйте ще раз або подзвоніть нам.', 'error');
        } finally {
            // Восстанавливаем кнопку
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    },
    
    initCalculationForm() {
        // Создаем форму расчета если нужно
        const calculatorSection = document.querySelector('.calculator-cta');
        if (calculatorSection) {
            // Можно добавить inline-форму для быстрого расчета
        }
    },
    
    async handleQuickCalculation(data) {
        try {
            // Отправляем данные расчета
            await TelegramAPI.sendCalculationNotification(data);
            
            // Перенаправляем в бота с параметрами
            const params = new URLSearchParams({
                start: 'calculation',
                area: data.area,
                type: data.type,
                budget: data.budget,
                phone: data.phone || ''
            });
            
            window.open(`https://t.me/${TELEGRAM_CONFIG.BOT_USERNAME}?${params.toString()}`, '_blank');
            
        } catch (error) {
            console.error('Calculation error:', error);
            this.showNotification('Помилка розрахунку. Спробуйте ще раз.', 'error');
        }
    },
    
    showNotification(message, type = 'info') {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        // Стили для уведомления
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        // Анимация
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
        `;
        document.head.appendChild(style);
        
        // Закрытие по кнопке
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        });
        
        // Авто-закрытие через 5 секунд
        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
};

// Navigation and UI
const UIManager = {
    init() {
        // Мобильное меню
        if (DOM.mobileMenuBtn && DOM.nav) {
            DOM.mobileMenuBtn.addEventListener('click', () => this.toggleMobileMenu());
            
            // Закрытие меню при клике на ссылку
            DOM.nav.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 768) {
                        DOM.nav.style.display = 'none';
                    }
                });
            });
        }
        
        // Плавная прокрутка
        this.initSmoothScroll();
        
        // Кнопки портфолио
        if (DOM.morePortfolioBtn) {
            DOM.morePortfolioBtn.addEventListener('click', () => {
                window.open(`https://t.me/${TELEGRAM_CONFIG.BOT_USERNAME}_portfolio`, '_blank');
            });
        }
        
        if (DOM.portfolioBtn) {
            DOM.portfolioBtn.addEventListener('click', () => {
                document.getElementById('portfolio').scrollIntoView({ 
                    behavior: 'smooth' 
                });
            });
        }
        
        // Фиксированный хедер
        this.initFixedHeader();
        
        // Анимации при скролле
        this.initScrollAnimations();
    },
    
    toggleMobileMenu() {
        if (DOM.nav.style.display === 'flex') {
            DOM.nav.style.display = 'none';
        } else {
            DOM.nav.style.display = 'flex';
            DOM.nav.style.flexDirection = 'column';
            DOM.nav.style.position = 'absolute';
            DOM.nav.style.top = '100%';
            DOM.nav.style.left = '0';
            DOM.nav.style.right = '0';
            DOM.nav.style.backgroundColor = 'var(--white)';
            DOM.nav.style.padding = '20px';
            DOM.nav.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
            DOM.nav.style.zIndex = '1000';
        }
    },
    
    initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    const headerHeight = document.querySelector('.header').offsetHeight;
                    const targetPosition = targetElement.offsetTop - headerHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    },
    
    initFixedHeader() {
        window.addEventListener('scroll', () => {
            const header = document.querySelector('.header');
            if (window.scrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    },
    
    initScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        // Наблюдаем за элементами для анимации
        document.querySelectorAll('.service-card, .portfolio-item, .price-card, .review-card').forEach(el => {
            observer.observe(el);
        });
    }
};

// Analytics and Tracking
const AnalyticsManager = {
    init() {
        this.trackTelegramClicks();
        this.trackFormSubmissions();
        this.trackUserBehavior();
    },
    
    trackTelegramClicks() {
        document.querySelectorAll('[data-telegram-click]').forEach(element => {
            element.addEventListener('click', () => {
                const action = element.getAttribute('data-telegram-click') || 'general_click';
                this.sendEvent('telegram_click', { action, element: element.tagName });
            });
        });
    },
    
    trackFormSubmissions() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', () => {
                const formName = form.id || 'unknown_form';
                this.sendEvent('form_submit', { form: formName });
            });
        });
    },
    
    trackUserBehavior() {
        // Трек просмотра секций
        const sections = document.querySelectorAll('section[id]');
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.sendEvent('section_view', { section: entry.target.id });
                }
            });
        }, { threshold: 0.5 });
        
        sections.forEach(section => sectionObserver.observe(section));
    },
    
    sendEvent(eventName, data = {}) {
        // Отправка данных в Telegram (можно заменить на Google Analytics)
        const eventData = {
            event: eventName,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            ...data
        };
        
        // Логируем в консоль для отладки
        console.log(`[Analytics] ${eventName}:`, eventData);
        
        // Можно отправлять в свой сервер или Telegram
        // TelegramAPI.sendMessage(TELEGRAM_CONFIG.CHAT_IDS.ADMIN, `Event: ${eventName}`);
    }
};

// Quick Calculation Widget
const QuickCalculator = {
    init() {
        this.createWidget();
    },
    
    createWidget() {
        // Создаем плавающий виджет быстрого расчета
        const widget = document.createElement('div');
        widget.className = 'quick-calculator-widget';
        widget.innerHTML = `
            <div class="calculator-toggle">
                <i class="fas fa-calculator"></i>
                <span>Швидкий розрахунок</span>
            </div>
            <div class="calculator-content">
                <h4>Розрахувати вартість</h4>
                <form id="quickCalcForm">
                    <div class="form-group">
                        <label>Площа (м²)</label>
                        <input type="number" min="10" max="500" required>
                    </div>
                    <div class="form-group">
                        <label>Тип ремонту</label>
                        <select required>
                            <option value="">Оберіть тип</option>
                            <option value="cosmetic">Косметичний</option>
                            <option value="capital">Капітальний</option>
                            <option value="premium">Преміум</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Бюджет (грн)</label>
                        <select required>
                            <option value="">Оберіть бюджет</option>
                            <option value="50000">До 50,000</option>
                            <option value="100000">До 100,000</option>
                            <option value="200000">До 200,000</option>
                            <option value="500000">До 500,000</option>
                            <option value="500000+">Від 500,000</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Ваш телефон (необов'язково)</label>
                        <input type="tel" placeholder="+38 (0__) ___ __ __">
                    </div>
                    <button type="submit" class="btn-primary">
                        <i class="fab fa-telegram-plane"></i> Отримати розрахунок у Telegram
                    </button>
                </form>
            </div>
        `;
        
        // Стили для виджета
        const style = document.createElement('style');
        style.textContent = `
            .quick-calculator-widget {
                position: fixed;
                bottom: 100px;
                right: 30px;
                z-index: 998;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                overflow: hidden;
                width: 350px;
                max-width: 90vw;
                transform: translateX(400px);
                transition: transform 0.3s ease;
            }
            .quick-calculator-widget.active {
                transform: translateX(0);
            }
            .calculator-toggle {
                background: var(--primary);
                color: white;
                padding: 15px 20px;
                display: flex;
                align-items: center;
                gap: 10px;
                cursor: pointer;
                font-weight: 600;
            }
            .calculator-content {
                padding: 20px;
                display: none;
            }
            .quick-calculator-widget.active .calculator-content {
                display: block;
            }
            .calculator-content h4 {
                margin-bottom: 20px;
                text-align: center;
            }
            .calculator-content .form-group {
                margin-bottom: 15px;
            }
            .calculator-content label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
                font-size: 0.9rem;
            }
            .calculator-content input,
            .calculator-content select {
                width: 100%;
                padding: 10px;
                border: 1px solid var(--light-gray);
                border-radius: 6px;
                font-size: 0.9rem;
            }
            .calculator-content button {
                width: 100%;
                margin-top: 10px;
            }
            @media (max-width: 768px) {
                .quick-calculator-widget {
                    bottom: 80px;
                    right: 15px;
                }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(widget);
        
        // Тоггл виджета
        const toggle = widget.querySelector('.calculator-toggle');
        toggle.addEventListener('click', () => {
            widget.classList.toggle('active');
        });
        
        // Обработка формы
        const form = widget.querySelector('#quickCalcForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = {
                    area: form.querySelector('input[type="number"]').value,
                    type: form.querySelector('select').value,
                    budget: form.querySelectorAll('select')[1].value,
                    phone: form.querySelector('input[type="tel"]').value || '',
                    source: 'quick_calculator'
                };
                
                await FormManager.handleQuickCalculation(formData);
                widget.classList.remove('active');
            });
        }
        
        // Закрытие при клике вне виджета
        document.addEventListener('click', (e) => {
            if (!widget.contains(e.target) && !e.target.closest('.telegram-float')) {
                widget.classList.remove('active');
            }
        });
    }
};

// Main Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 РемонтПро - сайт завантажено!');
    
    // Инициализация модулей
    ModalManager.init();
    FormManager.init();
    UIManager.init();
    AnalyticsManager.init();
    
    // Опционально: быстрый калькулятор
    // QuickCalculator.init();
    
    // Проверка конфигурации
    if (TELEGRAM_CONFIG.BOT_TOKEN === 'YOUR_BOT_TOKEN') {
        console.warn('⚠️ Замініть TELEGRAM_CONFIG.BOT_TOKEN на реальний токен бота!');
        FormManager.showNotification('Будь ласка, налаштуйте Telegram бота у файлі config.js', 'error');
    }
    
    // Добавляем год в футер
    const yearElement = document.querySelector('#currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
    
    // Анимация при загрузке
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);
});

// Service Worker для офлайн-работы (опционально)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(error => {
            console.log('ServiceWorker registration failed:', error);
        });
    });
}

// Глобальные обработчики ошибок
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Можно отправлять ошибки в Telegram
    // TelegramAPI.sendMessage(TELEGRAM_CONFIG.CHAT_IDS.ADMIN, `Error: ${event.message}`);
});

// Экспортируем для использования в консоли
window.RemontPro = {
    TelegramAPI,
    ModalManager,
    FormManager,
    appState,
    config: TELEGRAM_CONFIG
};
