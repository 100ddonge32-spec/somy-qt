
import sys

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    line = 1
    col = 1
    for char in content:
        if char == '{':
            stack.append((line, col))
        elif char == '}':
            if not stack:
                print(f"Extra '}}' at line {line}, col {col}")
                return
            stack.pop()
        
        if char == '\n':
            line += 1
            col = 1
        else:
            col += 1
    
    if stack:
        print(f"Unclosed '{{' at:")
        for l, c in stack:
            print(f"  line {l}, col {c}")
    else:
        print("Balanced")

if __name__ == "__main__":
    check_balance(sys.argv[1])
