
import sys

def check_depth(filepath, target_line=None):
    stack = []
    in_string = None
    with open(filepath, 'r') as f:
        for i, line in enumerate(f):
            l_num = i + 1
            if target_line and l_num == target_line:
                print(f"Stack at line {target_line}: {stack}")
                return
            
            idx = 0
            while idx < len(line):
                char = line[idx]
                if in_string:
                    if char == in_string:
                        if idx > 0 and line[idx-1] == '\\':
                            pass
                        else:
                            in_string = None
                else:
                    if char in ["'", '"', '`']:
                        in_string = char
                    elif char == '{':
                        stack.append(l_num)
                    elif char == '}':
                        if stack:
                            stack.pop()
                        else:
                            print(f"Extra }} at line {l_num}")
                idx += 1
    print(f"Final stack: {stack}")

if __name__ == "__main__":
    if len(sys.argv) > 2:
        check_depth(sys.argv[1], int(sys.argv[2]))
    else:
        check_depth(sys.argv[1])
