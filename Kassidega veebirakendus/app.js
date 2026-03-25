const cardsContainer = document.getElementById('cards');
const showCatsBtn = document.getElementById('showCatsBtn');
const cardsFound = document.getElementById('cardsFound');
const resetBtn = document.getElementById('resetBtn');
const themeBtn = document.getElementById('themeBtn');
const searchInput = document.getElementById('searchInput');
const originFilter = document.getElementById('originFilter');
const sortSelect = document.getElementById('sortSelect');
const favoritesOnly = document.getElementById('favoritesOnly');
const catModal = document.getElementById('catModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalImage = document.getElementById('modalImage');
const modalBreed = document.getElementById('modalBreed');
const modalOrigin = document.getElementById('modalOrigin');
const modalTemperament = document.getElementById('modalTemperament');
const toast = document.getElementById('toast');

const VISIBLE_CARDS_COUNT = 10;
const FAVORITES_STORAGE_KEY = 'cat-cards-favorites';
const THEME_STORAGE_KEY = 'cat-cards-theme';

const CAT_BREEDS = [
    { breed: 'Maine Coon', origin: 'United States', temperament: 'Gentle, friendly, intelligent', image: 'Cats/MaineCoon.jpg', cartoon: 'Cats cartoon/MaineCoon.png' },
    { breed: 'Siamese', origin: 'Thailand', temperament: 'Vocal, social, affectionate', image: 'Cats/Siamese.webp' },
    { breed: 'British Shorthair', origin: 'United Kingdom', temperament: 'Calm, easygoing, reserved', image: 'Cats/BritishShorthair.png' },
    { breed: 'Bengal', origin: 'United States', temperament: 'Energetic, curious, playful', image: 'Cats/Bengal.jpg' },
    { breed: 'Persian', origin: 'Iran (Persia)', temperament: 'Quiet, gentle, relaxed', image: 'Cats/Persian.jpg' },
    { breed: 'Ragdoll', origin: 'United States', temperament: 'Affectionate, calm, floppy', image: 'Cats/Ragdoll.jpg' },
    { breed: 'Sphynx', origin: 'Canada', temperament: 'Energetic, friendly, attention-seeking', image: 'Cats/Sphynx.jpg', cartoon: 'Cats cartoon/Sphynx.png' },
    { breed: 'Scottish Fold', origin: 'Scotland', temperament: 'Sweet, adaptable, quiet', image: 'Cats/Scottish Fold.jpg' },
    { breed: 'Abyssinian', origin: 'Ethiopia', temperament: 'Active, curious, playful', image: 'Cats/Abyssian.jpg', cartoon: 'Cats cartoon/Abyssian.png' },
    { breed: 'Russian Blue', origin: 'Russia', temperament: 'Quiet, loyal, shy', image: 'Cats/Russian Blue.webp' },
    { breed: 'Norwegian Forest Cat', origin: 'Norway', temperament: 'Independent, calm, friendly', image: 'Cats/NorwegianForest.jpg' },
    { breed: 'Savannah', origin: 'United States', temperament: 'Energetic, bold, intelligent', image: 'Cats/Savannah.jpg' },
    { breed: 'Devon Rex', origin: 'United Kingdom', temperament: 'Mischievous, playful, social', image: 'Cats/DevonRex.png' },
    { breed: 'Cornish Rex', origin: 'United Kingdom', temperament: 'Active, affectionate, lively', image: 'Cats/CornishRex.jpg' },
    { breed: 'Turkish Angora', origin: 'Turkey', temperament: 'Intelligent, energetic, affectionate', image: 'Cats/TurkishAngora.jpeg' },
    { breed: 'Birman', origin: 'Myanmar', temperament: 'Gentle, loving, social', image: 'Cats/Birman.jpg', cartoon: 'Cats cartoon/Birman.png' },
    { breed: 'Oriental Shorthair', origin: 'United States', temperament: 'Talkative, curious, loyal', image: 'Cats/OrientalShorthair.jpg' },
    { breed: 'Himalayan', origin: 'United States', temperament: 'Calm, affectionate, gentle', image: 'Cats/Himalayan.jpeg', cartoon: 'Cats cartoon/Himalayan.png' },
    { breed: 'Chartreux', origin: 'France', temperament: 'Quiet, observant, loyal', image: 'Cats/Chartreux.jpg' },
    { breed: 'Manx', origin: 'Isle of Man', temperament: 'Playful, intelligent, friendly', image: 'Cats/Manx.jpg' }
];

const state = {
    visibleCats: [],
    favorites: new Set(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]')),
    search: '',
    origin: 'all',
    sort: 'random',
    favoritesOnly: false
};

function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function saveFavorites() {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...state.favorites]));
}

function showToast(message) {
    if (!toast) {
        return;
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 1100);
}

function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark', isDark);
    if (themeBtn) {
        themeBtn.textContent = isDark ? 'Light Theme' : 'Toggle Theme';
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function initTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
    applyTheme(saved);
}

function populateOrigins() {
    if (!originFilter) {
        return;
    }

    const origins = [...new Set(CAT_BREEDS.map((cat) => cat.origin))].sort((a, b) => a.localeCompare(b));
    origins.forEach((origin) => {
        const option = document.createElement('option');
        option.value = origin;
        option.textContent = origin;
        originFilter.appendChild(option);
    });
}

function openDetails(cat) {
    if (!catModal || !modalImage || !modalBreed || !modalOrigin || !modalTemperament) {
        return;
    }

    modalImage.src = encodeURI(cat.image);
    modalImage.alt = cat.breed;
    modalBreed.textContent = cat.breed;
    modalOrigin.textContent = `Origin: ${cat.origin}`;
    modalTemperament.textContent = `Temperament: ${cat.temperament}`;

    if (typeof catModal.showModal === 'function') {
        catModal.showModal();
    }
}

function getFilteredCats() {
    let cats = [...state.visibleCats];

    if (state.search) {
        const needle = state.search.toLowerCase();
        cats = cats.filter((cat) => cat.breed.toLowerCase().includes(needle));
    }

    if (state.origin !== 'all') {
        cats = cats.filter((cat) => cat.origin === state.origin);
    }

    if (state.favoritesOnly) {
        cats = cats.filter((cat) => state.favorites.has(cat.breed));
    }

    if (state.sort === 'az') {
        cats.sort((a, b) => a.breed.localeCompare(b.breed));
    }

    if (state.sort === 'za') {
        cats.sort((a, b) => b.breed.localeCompare(a.breed));
    }

    return cats;
}

function createCard(cat) {
    const imageUrl = encodeURI(cat.image);
    const cartoonUrl = cat.cartoon ? encodeURI(cat.cartoon) : '';
    const isFavorite = state.favorites.has(cat.breed);

    const card = document.createElement('article');
    card.className = `card ${cartoonUrl ? 'has-cartoon' : ''}`.trim();
    card.innerHTML = `
        <div class="card-image-wrapper">
            <img class="card-image" src="${imageUrl}" alt="${cat.breed}">
        </div>
        <div class="card-body">
            <h3 class="breed">${cat.breed}</h3>
            <p class="meta"><strong>Origin:</strong> ${cat.origin}</p>
            <p class="meta"><strong>Temperament:</strong> ${cat.temperament}</p>
            <div class="card-actions">
                <button class="mini-btn favorite ${isFavorite ? 'active' : ''}" data-action="favorite" data-breed="${cat.breed}">${isFavorite ? '★ Favorite' : '☆ Favorite'}</button>
                <button class="mini-btn" data-action="copy" data-breed="${cat.breed}">Copy Info</button>
                <button class="mini-btn" data-action="details" data-breed="${cat.breed}">Details</button>
            </div>
        </div>
    `;

    if (cartoonUrl) {
        const imageEl = card.querySelector('.card-image');
        let swapTimer;

        const swapImage = (nextUrl, hideText) => {
            clearTimeout(swapTimer);
            card.classList.toggle('hide-text', hideText);
            imageEl.classList.remove('swap-in');
            imageEl.classList.add('swap-out');

            swapTimer = setTimeout(() => {
                imageEl.src = nextUrl;
                imageEl.classList.remove('swap-out');
                imageEl.classList.add('swap-in');
            }, 130);
        };

        card.addEventListener('mouseenter', () => swapImage(cartoonUrl, true));
        card.addEventListener('mouseleave', () => swapImage(imageUrl, false));
    }

    return card;
}

function renderCards() {
    cardsContainer.innerHTML = '';
    const cats = getFilteredCats();

    if (!cats.length) {
        cardsContainer.innerHTML = '<p class="empty-state">No cats match your filters.</p>';
    } else {
        cats.forEach((cat) => cardsContainer.appendChild(createCard(cat)));
    }

    cardsFound.textContent = `Cards found: ${cats.length}`;
}

function loadCats() {
    state.visibleCats = shuffle(CAT_BREEDS).slice(0, VISIBLE_CARDS_COUNT);
    renderCards();
}

showCatsBtn.addEventListener('click', loadCats);

if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        state.search = '';
        state.origin = 'all';
        state.sort = 'random';
        state.favoritesOnly = false;

        if (searchInput) searchInput.value = '';
        if (originFilter) originFilter.value = 'all';
        if (sortSelect) sortSelect.value = 'random';
        if (favoritesOnly) favoritesOnly.checked = false;

        renderCards();
    });
}

if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        const next = document.body.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(next);
    });
}

if (searchInput) {
    searchInput.addEventListener('input', (event) => {
        state.search = event.target.value.trim();
        renderCards();
    });
}

if (originFilter) {
    originFilter.addEventListener('change', (event) => {
        state.origin = event.target.value;
        renderCards();
    });
}

if (sortSelect) {
    sortSelect.addEventListener('change', (event) => {
        state.sort = event.target.value;
        renderCards();
    });
}

if (favoritesOnly) {
    favoritesOnly.addEventListener('change', (event) => {
        state.favoritesOnly = event.target.checked;
        renderCards();
    });
}

cardsContainer.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) {
        return;
    }

    const { action, breed } = button.dataset;
    const cat = CAT_BREEDS.find((item) => item.breed === breed);
    if (!cat) {
        return;
    }

    if (action === 'favorite') {
        const cardEl = button.closest('.card');

        if (state.favorites.has(breed)) {
            state.favorites.delete(breed);
        } else {
            state.favorites.add(breed);
        }

        saveFavorites();

        const isNowFavorite = state.favorites.has(breed);
        button.classList.toggle('active', isNowFavorite);
        button.textContent = isNowFavorite ? '★ Favorite' : '☆ Favorite';

        if (state.favoritesOnly && !isNowFavorite && cardEl) {
            cardEl.remove();
        }

        const visibleCardCount = cardsContainer.querySelectorAll('.card').length;
        if (visibleCardCount === 0) {
            cardsContainer.innerHTML = '<p class="empty-state">No cats match your filters.</p>';
        }
        cardsFound.textContent = `Cards found: ${visibleCardCount}`;

        return;
    }

    if (action === 'copy') {
        const text = `${cat.breed} | Origin: ${cat.origin} | Temperament: ${cat.temperament}`;
        try {
            await navigator.clipboard.writeText(text);
            button.textContent = 'Copied!';
            setTimeout(() => {
                button.textContent = 'Copy Info';
            }, 900);
            showToast('Copied');
        } catch (error) {
            button.textContent = 'Copy failed';
            setTimeout(() => {
                button.textContent = 'Copy Info';
            }, 900);
        }
        return;
    }

    if (action === 'details') {
        openDetails(cat);
    }
});

if (closeModalBtn && catModal) {
    closeModalBtn.addEventListener('click', () => catModal.close());
    catModal.addEventListener('click', (event) => {
        if (event.target === catModal) {
            catModal.close();
        }
    });
}

populateOrigins();
initTheme();
loadCats();
