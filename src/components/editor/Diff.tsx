import { Change } from "diff"

const Diff = ({ diffOutput }: { diffOutput: Change[] }) => (
    <div>
        <div className='diff'>
            {diffOutput.map((part, index) => (
                <span
                    key={index}
                    className={
                        part.added
                            ? 'added'
                            : part.removed
                                ? 'removed'
                                : ''
                    }
                >
                    {part.value}
                </span>
            ))}
        </div>
    </div>
)

export default Diff