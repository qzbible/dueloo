import random
from typing import List, Optional


def get_quiz_qui_a_dit(lang: str = "fr"):
    content = {
        "fr": [
            {"text": "Je suis le chemin, la vérité et la vie", "author": "Jésus", "options": ["Pierre", "Jésus", "Paul", "Jean"]},
            {"text": "Me voici, envoie-moi", "author": "Ésaïe", "options": ["Moïse", "David", "Ésaïe", "Jérémie"]},
            {"text": "L'Éternel est mon berger", "author": "David", "options": ["Salomon", "David", "Samuel", "Élie"]},
            {"text": "Avant que tu naisses, je t'ai connu", "author": "Dieu", "options": ["Dieu", "Moïse", "Abraham", "Jacob"]},
            {"text": "Que ton règne vienne", "author": "Jésus", "options": ["Jean", "Pierre", "Jésus", "Matthieu"]},
            {"text": "Aimez vos ennemis", "author": "Jésus", "options": ["Paul", "Jean", "Jésus", "Jacques"]},
            {"text": "J'ai combattu le bon combat, j'ai achevé la course", "author": "Paul", "options": ["Pierre", "Timothée", "Paul", "Barnabas"]},
            {"text": "Suis-je le gardien de mon frère ?", "author": "Caïn", "options": ["Abel", "Caïn", "Seth", "Lamek"]},
            {"text": "Parle, car ton serviteur écoute", "author": "Samuel", "options": ["David", "Éli", "Samuel", "Saül"]},
            {"text": "Ce n'est plus moi qui vis, c'est Christ qui vit en moi", "author": "Paul", "options": ["Pierre", "Paul", "Jean", "Luc"]},
            {"text": "Femme, où sont ceux qui t'accusaient ?", "author": "Jésus", "options": ["Pierre", "Paul", "Jésus", "Pilate"]},
            {"text": "Mon Dieu, mon Dieu, pourquoi m'as-tu abandonné ?", "author": "Jésus", "options": ["David", "Job", "Jésus", "Jérémie"]},
            {"text": "Où tu iras j'irai, où tu demeureras je demeurerai", "author": "Ruth", "options": ["Esther", "Ruth", "Naomi", "Sara"]},
            {"text": "Ne crains point, car je suis avec toi", "author": "Dieu", "options": ["Moïse", "Dieu", "Josué", "Ésaïe"]},
            {"text": "Lazare, sors !", "author": "Jésus", "options": ["Pierre", "Jésus", "Marthe", "Jean"]}
        ],
        "en": [
            {"text": "I am the way, the truth and the life", "author": "Jesus", "options": ["Peter", "Jesus", "Paul", "John"]},
            {"text": "Here am I, send me", "author": "Isaiah", "options": ["Moses", "David", "Isaiah", "Jeremiah"]},
            {"text": "The Lord is my shepherd", "author": "David", "options": ["Solomon", "David", "Samuel", "Elijah"]},
            {"text": "Before you were born, I knew you", "author": "God", "options": ["God", "Moses", "Abraham", "Jacob"]},
            {"text": "Your kingdom come", "author": "Jesus", "options": ["John", "Peter", "Jesus", "Matthew"]},
            {"text": "Love your enemies", "author": "Jesus", "options": ["Paul", "John", "Jesus", "James"]},
            {"text": "I have fought the good fight, I have finished the race", "author": "Paul", "options": ["Peter", "Timothy", "Paul", "Barnabas"]},
            {"text": "Am I my brother's keeper?", "author": "Cain", "options": ["Abel", "Cain", "Seth", "Lamech"]},
            {"text": "Speak, for your servant is listening", "author": "Samuel", "options": ["David", "Eli", "Samuel", "Saul"]},
            {"text": "It is no longer I who live, but Christ who lives in me", "author": "Paul", "options": ["Peter", "Paul", "John", "Luke"]},
            {"text": "Woman, where are those who accused you?", "author": "Jesus", "options": ["Peter", "Paul", "Jesus", "Pilate"]},
            {"text": "My God, my God, why have you forsaken me?", "author": "Jesus", "options": ["David", "Job", "Jesus", "Jeremiah"]},
            {"text": "Where you go I will go, where you stay I will stay", "author": "Ruth", "options": ["Esther", "Ruth", "Naomi", "Sarah"]},
            {"text": "Fear not, for I am with you", "author": "God", "options": ["Moses", "God", "Joshua", "Isaiah"]},
            {"text": "Lazarus, come out!", "author": "Jesus", "options": ["Peter", "Jesus", "Martha", "John"]}
        ]
    }
    data = content.get(lang, content["fr"])
    random.shuffle(data)
    return {"quotes": data[:5]}


def get_quiz_vrai_faux(lang: str = "fr"):
    content = {
        "fr": [
            {"text": "Jésus a changé l'eau en vin à Cana", "answer": True},
            {"text": "Moïse a traversé la mer Morte", "answer": False},
            {"text": "David a vaincu Goliath avec une épée", "answer": False},
            {"text": "Jonas a été avalé par un grand poisson", "answer": True},
            {"text": "Marie-Madeleine était l'épouse de Jésus", "answer": False},
            {"text": "Pierre a marché sur l'eau", "answer": True},
            {"text": "Abraham avait 100 ans quand Isaac est né", "answer": True},
            {"text": "Il y a 13 apôtres", "answer": False},
            {"text": "Noé a construit l'arche en 40 jours", "answer": False},
            {"text": "Samson a perdu sa force quand on lui a coupé les cheveux", "answer": True},
            {"text": "Le premier miracle de Jésus était de guérir un aveugle", "answer": False},
            {"text": "Judas a trahi Jésus pour 30 pièces d'argent", "answer": True},
            {"text": "Le livre le plus court de la Bible est Philémon", "answer": False},
            {"text": "Matthusalem est l'homme le plus vieux de la Bible", "answer": True},
            {"text": "Paul s'appelait d'abord Saul", "answer": True},
            {"text": "Ézéchiel a eu la vision des ossements desséchés", "answer": True}
        ],
        "en": [
            {"text": "Jesus turned water into wine at Cana", "answer": True},
            {"text": "Moses crossed the Dead Sea", "answer": False},
            {"text": "David defeated Goliath with a sword", "answer": False},
            {"text": "Jonah was swallowed by a great fish", "answer": True},
            {"text": "Mary Magdalene was Jesus' wife", "answer": False},
            {"text": "Peter walked on water", "answer": True},
            {"text": "Abraham was 100 years old when Isaac was born", "answer": True},
            {"text": "There were 13 apostles", "answer": False},
            {"text": "Noah built the ark in 40 days", "answer": False},
            {"text": "Samson lost his strength when his hair was cut", "answer": True},
            {"text": "Jesus' first miracle was healing a blind man", "answer": False},
            {"text": "Judas betrayed Jesus for 30 pieces of silver", "answer": True},
            {"text": "The shortest book of the Bible is Philemon", "answer": False},
            {"text": "Methuselah is the oldest man in the Bible", "answer": True},
            {"text": "Paul was first called Saul", "answer": True},
            {"text": "Ezekiel had the vision of the dry bones", "answer": True}
        ]
    }
    data = content.get(lang, content["fr"])
    random.shuffle(data)
    return {"statements": data[:6]}


def get_chrono_versets(lang: str = "fr"):
    content = {
        "fr": [
            {"text": "Car Dieu a tant aimé le monde qu'il a donné son Fils unique", "missing": "monde", "reference": "Jean 3:16"},
            {"text": "L'Éternel est mon berger, je ne manquerai de rien", "missing": "berger", "reference": "Psaume 23:1"},
            {"text": "Je puis tout par celui qui me fortifie", "missing": "fortifie", "reference": "Philippiens 4:13"},
            {"text": "Demandez et vous recevrez", "missing": "recevrez", "reference": "Matthieu 7:7"},
            {"text": "Au commencement, Dieu créa les cieux et la terre", "missing": "commencement", "reference": "Genèse 1:1"},
            {"text": "Heureux les artisans de paix, car ils seront appelés fils de Dieu", "missing": "paix", "reference": "Matthieu 5:9"},
            {"text": "La foi est une ferme assurance des choses qu'on espère", "missing": "espère", "reference": "Hébreux 11:1"},
            {"text": "Je suis la résurrection et la vie", "missing": "résurrection", "reference": "Jean 11:25"},
            {"text": "L'amour est patient, l'amour est bon", "missing": "patient", "reference": "1 Corinthiens 13:4"},
            {"text": "Tu aimeras ton prochain comme toi-même", "missing": "prochain", "reference": "Lévitique 19:18"}
        ],
        "en": [
            {"text": "For God so loved the world that he gave his only Son", "missing": "world", "reference": "John 3:16"},
            {"text": "The Lord is my shepherd, I shall not want", "missing": "shepherd", "reference": "Psalm 23:1"},
            {"text": "I can do all things through him who strengthens me", "missing": "strengthens", "reference": "Philippians 4:13"},
            {"text": "Ask and you shall receive", "missing": "receive", "reference": "Matthew 7:7"},
            {"text": "In the beginning, God created the heavens and the earth", "missing": "beginning", "reference": "Genesis 1:1"},
            {"text": "Blessed are the peacemakers, for they shall be called sons of God", "missing": "peacemakers", "reference": "Matthew 5:9"},
            {"text": "Faith is the assurance of things hoped for", "missing": "hoped", "reference": "Hebrews 11:1"},
            {"text": "I am the resurrection and the life", "missing": "resurrection", "reference": "John 11:25"},
            {"text": "Love is patient, love is kind", "missing": "patient", "reference": "1 Corinthians 13:4"},
            {"text": "You shall love your neighbor as yourself", "missing": "neighbor", "reference": "Leviticus 19:18"}
        ]
    }
    data = content.get(lang, content["fr"])
    random.shuffle(data)
    return {"verses": data[:4]}


def get_mots_caches(lang: str = "fr"):
    words_map = {
        "fr": ["GENESE", "EXODE", "JEAN", "MARC", "LUC", "ACTES", "PAUL", "DAVID", "MOISE", "RUTH"],
        "en": ["GENESIS", "EXODUS", "JOHN", "MARK", "LUKE", "ACTS", "PAUL", "DAVID", "MOSES", "RUTH"]
    }
    words = words_map.get(lang, words_map["fr"])
    return words


def get_anagrammes(lang: str = "fr"):
    content = {
        "fr": [
            {"scrambled": "OSMEI", "answer": "MOISE"},
            {"scrambled": "VDDAI", "answer": "DAVID"},
            {"scrambled": "EHERST", "answer": "ESTHER"},
            {"scrambled": "ULAP", "answer": "PAUL"},
            {"scrambled": "RREIPE", "answer": "PIERRE"},
            {"scrambled": "HAMRAAB", "answer": "ABRAHAM"},
            {"scrambled": "OONSML", "answer": "SALOMON"},
            {"scrambled": "NOAJ", "answer": "JONA"},
            {"scrambled": "LEID", "answer": "ELIE"},
            {"scrambled": "SEMULA", "answer": "SAMUEL"}
        ],
        "en": [
            {"scrambled": "SEOMS", "answer": "MOSES"},
            {"scrambled": "VDDAI", "answer": "DAVID"},
            {"scrambled": "EHERST", "answer": "ESTHER"},
            {"scrambled": "ULAP", "answer": "PAUL"},
            {"scrambled": "RETEP", "answer": "PETER"},
            {"scrambled": "HAMRAAB", "answer": "ABRAHAM"},
            {"scrambled": "OONSML", "answer": "SOLOMON"},
            {"scrambled": "NOAHJ", "answer": "JONAH"},
            {"scrambled": "JALIHE", "answer": "ELIJAH"},
            {"scrambled": "SEMULA", "answer": "SAMUEL"}
        ]
    }
    data = content.get(lang, content["fr"])
    random.shuffle(data)
    return {"anagrams": data[:5]}


def get_labyrinthe_questions(lang: str = "fr"):
    content = {
        "fr": [
            {"text": "Qui a guidé le peuple hors d'Égypte ?", "options": ["Abraham", "Moïse", "David", "Josué"], "answer": 1},
            {"text": "Combien de plaies Dieu a-t-il envoyées ?", "options": ["5", "7", "10", "12"], "answer": 2},
            {"text": "Quelle mer le peuple a-t-il traversée ?", "options": ["Mer Morte", "Mer Rouge", "Mer Méditerranée", "Mer de Galilée"], "answer": 1},
            {"text": "Combien de jours Moïse est-il resté sur le mont Sinaï ?", "options": ["7", "20", "40", "100"], "answer": 2},
            {"text": "Quel aliment Dieu a-t-il envoyé du ciel ?", "options": ["Du pain", "De la manne", "Des fruits", "Du poisson"], "answer": 1}
        ],
        "en": [
            {"text": "Who led the people out of Egypt?", "options": ["Abraham", "Moses", "David", "Joshua"], "answer": 1},
            {"text": "How many plagues did God send?", "options": ["5", "7", "10", "12"], "answer": 2},
            {"text": "Which sea did the people cross?", "options": ["Dead Sea", "Red Sea", "Mediterranean Sea", "Sea of Galilee"], "answer": 1},
            {"text": "How many days did Moses stay on Mount Sinai?", "options": ["7", "20", "40", "100"], "answer": 2},
            {"text": "What food did God send from heaven?", "options": ["Bread", "Manna", "Fruit", "Fish"], "answer": 1}
        ]
    }
    return content.get(lang, content["fr"])
