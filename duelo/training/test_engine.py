from game_engine import build_payoff_matrix

if __name__ == '__main__':
    m = build_payoff_matrix('beginner')
    print('states:', len(m))
    keys = list(m.keys())
    print('sample keys:', keys[:5])
    first = keys[0]
    print('first key:', first)
    print('first outcome sample:', list(m[first]['outcomes'].items())[:2])
