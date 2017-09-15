from flask import Flask
from subprocess import check_output

app = Flask(__name__)

CORTEXJDK_JAR = 'libs/CortexJDK/dist/cortexjdk.jar'
GRAPH = 'data/test.ctx'


@app.route('/view_kmer/<kmer>')
def view_kmer(kmer):
    return check_output(['java', '-jar', CORTEXJDK_JAR, 'Print', '--graph', GRAPH, '--record',
                         kmer])
